import express, { Response, Request } from 'express'
import { fork } from 'child_process'
import cors from 'cors'
import path from 'path'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = 4000

interface TaskProcess {
  [key: string]: {
    process: ReturnType<typeof fork>
    clients: express.Response<any, Record<string, any>>[]
    startTime: number
    currentProgress: number
    isComplete: boolean
  }
}

const taskProcesses: TaskProcess = {}

// Cleanup any stale tasks older than 1 minute
setInterval(() => {
  const now = Date.now()
  Object.entries(taskProcesses).forEach(([taskId, task]) => {
    if (now - task.startTime > 60000) { // 60 seconds
      task.process.kill()
      delete taskProcesses[taskId]
    }
  })
}, 30000) // Check every 30 seconds

app.get("/healthcheck", (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: "healthy" })
})

app.post('/api/start-task', (req: express.Request, res: express.Response) => {
  const taskId = Date.now().toString()
  
  const childProcess = fork(path.join(__dirname, 'worker.js'))
  
  taskProcesses[taskId] = {
    process: childProcess,
    clients: [],
    startTime: Date.now(),
    currentProgress: 0,
    isComplete: false
  }
  
  // Listen for updates from child process
  childProcess.on('message', (message: { progress: number, taskId: string }) => {
    if (taskProcesses[taskId]) {
      taskProcesses[taskId].currentProgress = message.progress
      taskProcesses[taskId].isComplete = message.progress >= 100
      
      // Broadcast to all clients
      taskProcesses[taskId].clients.forEach(client => {
        client.write(`data: ${JSON.stringify(message)}\n\n`)
      })
    }
  })
  
  childProcess.send({ taskId })
  
  res.json({ taskId, message: 'Task started' })
})

app.get('/api/task-updates/:taskId', (req: any, res: any) => {
  const { taskId } = req.params
  
  if (!taskProcesses[taskId]) {
    return res.status(404).json({ error: 'Task not found' })
  }
  
  // SSE setup
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  
  const keepAlive = setInterval(() => {
    res.write(':\n\n')
  }, 30000)
  
  // Send current progress immediately
  const currentProgress = taskProcesses[taskId].currentProgress
  res.write(`data: ${JSON.stringify({
    taskId,
    progress: currentProgress,
    message: `Task ${taskId} is ${currentProgress}% complete`
  })}\n\n`)
  
  // Add this client to the list
  taskProcesses[taskId].clients.push(res)
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(keepAlive)
    if (taskProcesses[taskId]) {
      taskProcesses[taskId].clients = taskProcesses[taskId].clients.filter(client => client !== res)
      
      // Only cleanup task if it's complete and has no clients
      if (taskProcesses[taskId].clients.length === 0 && taskProcesses[taskId].isComplete) {
        taskProcesses[taskId].process.kill()
        delete taskProcesses[taskId]
      }
    }
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})