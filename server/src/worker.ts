interface TaskMessage {
  taskId: string
}

process.on('message', ({ taskId }: TaskMessage) => {
  let progress = 0
  
  const interval = setInterval(() => {
    progress += 0.1
    
    if (process.send) {
      process.send({
        taskId,
        progress,
        message: `Task ${taskId} is ${progress}% complete`
      })
    }
    
    if (progress >= 100) {
      clearInterval(interval)
      if (process.send) {
        process.send({
          taskId,
          progress: 100,
          message: `Task ${taskId} completed!`
        })
      }
      process.exit()
    }
  }, 1000)
})