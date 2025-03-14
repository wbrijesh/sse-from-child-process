// 'use client';

// import { useState, useEffect, use } from 'react'
// import { useRouter } from 'next/navigation'

// export default function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
//   const [updates, setUpdates] = useState<string[]>([])
//   const router = useRouter()
//   const taskId = use(params).taskId

//   useEffect(() => {
//     // Clear updates on mount
//     setUpdates([])

//     // Start listening for updates
//     const eventSource = new EventSource(`https://localhost:4000/api/task-updates/${taskId}`)
    
//     eventSource.onmessage = (event) => {
//       const update = JSON.parse(event.data)
//       // Only add the update if it's not already in the array
//       if (!updates.includes(update.message)) {
//         setUpdates(prev => [...prev, update.message])
//       }
      
//       if (update.progress === 100) {
//         eventSource.close()
//       }
//     }
    
//     eventSource.onerror = () => {
//       eventSource.close()
//     }

//     return () => {
//       eventSource.close()
//     }
//   }, [taskId])

//   return (
//     <div style={{ padding: '20px' }}>
//       <h1>Task Details</h1>
//       <p>Task ID: {taskId}</p>
      
//       <div style={{ marginTop: '20px' }}>
//         <h2>Updates:</h2>
//         {updates.map((update, index) => (
//           <p key={index}>{update}</p>
//         ))}
//       </div>
//     </div>
//   )
// }

'use client';

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const [updates, setUpdates] = useState<string[]>([])
  const router = useRouter()
  const taskId = use(params).taskId

  useEffect(() => {
    // Clear updates only when taskId changes, not on every mount
    setUpdates([])
    
    const eventSource = new EventSource(`https://sse.brijesh.dev/api/task-updates/${taskId}`)
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data)
      setUpdates(prev => {
        // Check if this message already exists in our updates
        if (prev.includes(update.message)) {
          return prev
        }
        return [...prev, update.message]
      })
      
      if (update.progress === 100) {
        eventSource.close()
      }
    }
    
    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [taskId]) // Only taskId in dependencies, not updates

  return (
    <div style={{ padding: '20px' }}>
      <h1>Task Details</h1>
      <p>Task ID: {taskId}</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Updates:</h2>
        {updates.map((update, index) => (
          <p key={index}>{update}</p>
        ))}
      </div>
    </div>
  )
}
