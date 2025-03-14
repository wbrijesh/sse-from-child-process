"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const child_process_1 = require("child_process");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = 4000;
const taskProcesses = {};
// Endpoint to start a long running task
app.post('/api/start-task', (req, res) => {
    const taskId = Date.now().toString();
    // Create a child process - note the path is relative to the dist directory
    const childProcess = (0, child_process_1.fork)(path_1.default.join(__dirname, 'worker.js'));
    taskProcesses[taskId] = {
        process: childProcess,
        clients: []
    };
    // Start the task in child process
    childProcess.send({ taskId });
    res.json({ taskId, message: 'Task started' });
});
// SSE endpoint to receive updates
app.get('/api/task-updates/:taskId', (req, res) => {
    const { taskId } = req.params;
    // SSE setup
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    // Keep connection alive
    const keepAlive = setInterval(() => {
        res.write(':\n\n');
    }, 30000);
    // Add this client to the list of clients for this task
    if (taskProcesses[taskId]) {
        taskProcesses[taskId].clients.push(res);
        // Listen for messages from child process
        taskProcesses[taskId].process.on('message', (message) => {
            res.write(`data: ${JSON.stringify(message)}\n\n`);
        });
    }
    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(keepAlive);
        if (taskProcesses[taskId]) {
            taskProcesses[taskId].clients = taskProcesses[taskId].clients.filter(client => client !== res);
            // If no clients are listening, cleanup the task
            if (taskProcesses[taskId].clients.length === 0) {
                taskProcesses[taskId].process.kill();
                delete taskProcesses[taskId];
            }
        }
    });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
