"use strict";
process.on('message', ({ taskId }) => {
    let progress = 0;
    // Simulate work with progress updates
    const interval = setInterval(() => {
        progress += 2;
        if (process.send) {
            process.send({
                taskId,
                progress,
                message: `Task ${taskId} is ${progress}% complete`
            });
        }
        if (progress >= 100) {
            clearInterval(interval);
            if (process.send) {
                process.send({
                    taskId,
                    progress: 100,
                    message: `Task ${taskId} completed!`
                });
            }
            process.exit();
        }
    }, 1000); // Send update every 1 seconds
});
