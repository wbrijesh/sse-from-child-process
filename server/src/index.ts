import express, { Response } from 'express'
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
    clients: express.Response<any, Record<string, any>>[]  // Updated type
  }
}

const taskProcesses: TaskProcess = {}

// Endpoint to start a long running task
app.post('/api/start-task', (req, res) => {
  const taskId = Date.now().toString()
  
  // Create a child process - note the path is relative to the dist directory
  const childProcess = fork(path.join(__dirname, 'worker.js'))
  
  taskProcesses[taskId] = {
    process: childProcess,
    clients: []
  }
  
  // Start the task in child process
  childProcess.send({ taskId })
  
  res.json({ taskId, message: 'Task started' })
})

// SSE endpoint to receive updates
app.get('/api/task-updates/:taskId', (req, res: express.Response) => {  // Explicitly type the response
  const { taskId } = req.params
  
  // SSE setup
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(':\n\n')
  }, 30000)
  
  // Add this client to the list of clients for this task
  if (taskProcesses[taskId]) {
    taskProcesses[taskId].clients.push(res)
    
    // Listen for messages from child process
    taskProcesses[taskId].process.on('message', (message) => {
      res.write(`data: ${JSON.stringify(message)}\n\n`)
    })
  }
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(keepAlive)
    if (taskProcesses[taskId]) {
      taskProcesses[taskId].clients = taskProcesses[taskId].clients.filter(client => 
        client !== res
      )
      
      // If no clients are listening, cleanup the task
      if (taskProcesses[taskId].clients.length === 0) {
        taskProcesses[taskId].process.kill()
        delete taskProcesses[taskId]
      }
    }
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
