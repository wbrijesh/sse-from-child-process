'use client';

import { useState, useEffect } from 'react'

export default function Home() {
  const [taskId, setTaskId] = useState<string | null>(null)
  const [updates, setUpdates] = useState<string[]>([])
  
  const startTask = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/start-task', {
        method: 'POST'
      })
      const data = await response.json()
      setTaskId(data.taskId)
      setUpdates([`Task started with ID: ${data.taskId}`])
      
      // Start listening for updates
      const eventSource = new EventSource(`http://localhost:4000/api/task-updates/${data.taskId}`)
      
      eventSource.onmessage = (event) => {
        const update = JSON.parse(event.data)
        setUpdates(prev => [...prev, update.message])
        
        if (update.progress === 100) {
          eventSource.close()
        }
      }
      
      eventSource.onerror = () => {
        eventSource.close()
      }
    } catch (error) {
      console.error('Error starting task:', error)
    }
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>SSE Long Task Example</h1>
      <button onClick={startTask} disabled={!!taskId}>
        Start Long Task
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Updates:</h2>
        {updates.map((update, index) => (
          <p key={index}>{update}</p>
        ))}
      </div>
    </div>
  )
}
