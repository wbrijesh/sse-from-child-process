'use client';

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const startTask = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:4000/api/start-task', {
        method: 'POST'
      })
      const data = await response.json()
      
      // Redirect to the task details page
      router.push(`/${data.taskId}`)
    } catch (error) {
      console.error('Error starting task:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>SSE Long Task Example</h1>
      <button onClick={startTask} disabled={loading}>
        {loading ? 'Creating task...' : 'Start Long Task'}
      </button>
    </div>
  )
}
