import { useEffect } from 'react';
import { useHiveStore } from '../store/useHiveStore';

export const useSocketEvents = () => {
  const { 
    socket, 
    setQueenStatus, 
    updateAgentStatus, 
    spawnAgent, 
    updateToolCall,
    activeThreadId,
    projects
  } = useHiveStore();

  useEffect(() => {
    if (!socket) return;

    const onQueenStatus = (data: { status: string }) => {
      console.log(`[SocketHook] Queen Status: ${data.status}`);
      setQueenStatus(data.status);
    };

    const onUIUpdate = (data: any) => {
      console.log(`[SocketHook] UI Update:`, data);
      if (data.action === 'SPAWN_AGENT_UI') {
        spawnAgent(data.payload.projectId, data.payload);
      }
      if (data.action === 'SET_AGENT_STATUS') {
        updateAgentStatus(data.payload.projectId, data.payload.agentName, data.payload.status);
      }
    };

    const onNativeNotification = (data: any) => {
      console.log(`[SocketHook] Native Notification:`, data);
      if ((window as any).electron) {
        (window as any).electron.notify(data.title, data.body);
      }
    };

    const onToolExecution = (data: any) => {
      console.log(`[SocketHook] Tool Execution:`, data);
      if (activeThreadId) {
        const projectId = data.projectId || (projects.length > 0 ? projects[0].id : null);
        if (projectId) {
          const project = projects.find(p => p.id === projectId);
          const thread = project?.threads?.find((t: any) => t.id === activeThreadId);
          if (thread) {
            const messageIndex = thread.messages.length - 1;
            updateToolCall(projectId, activeThreadId, messageIndex, data.toolCallId || data.tool, {
              status: data.status,
              arguments: data.args
            });
          }
        }
      }
    };

    const onToolResult = (data: any) => {
      console.log(`[SocketHook] Tool Result:`, data);
      if (activeThreadId) {
        const projectId = data.projectId || (projects.length > 0 ? projects[0].id : null);
        if (projectId) {
          const project = projects.find(p => p.id === projectId);
          const thread = project?.threads?.find((t: any) => t.id === activeThreadId);
          if (thread) {
            const messageIndex = thread.messages.length - 1;
            updateToolCall(projectId, activeThreadId, messageIndex, data.toolCallId || data.tool, {
              status: data.status,
              result: data.result,
              error: data.error
            });
          }
        }
      }
    };

    socket.on('QUEEN_STATUS', onQueenStatus);
    socket.on('UI_UPDATE', onUIUpdate);
    socket.on('NATIVE_NOTIFICATION', onNativeNotification);
    socket.on('TOOL_EXECUTION', onToolExecution);
    socket.on('TOOL_RESULT', onToolResult);

    return () => {
      socket.off('QUEEN_STATUS', onQueenStatus);
      socket.off('UI_UPDATE', onUIUpdate);
      socket.off('NATIVE_NOTIFICATION', onNativeNotification);
      socket.off('TOOL_EXECUTION', onToolExecution);
      socket.off('TOOL_RESULT', onToolResult);
    };
  }, [socket, setQueenStatus, updateAgentStatus, spawnAgent, updateToolCall, activeThreadId, projects]);
};
