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
      if (data.action === 'ADD_MESSAGE') {
        const projectId = useHiveStore.getState().projects.find(p => p.threads?.some((t: any) => t.id === activeThreadId))?.id;
        if (projectId && activeThreadId) {
          useHiveStore.getState().addMessage(projectId, activeThreadId, data.payload);
        }
      }
      if (data.action === 'SET_ACTIVE_PLAN') {
        useHiveStore.getState().setActivePlan(data.payload.plan);
      }
      if (data.action === 'NOTIFY_CONTEXT_PRUNE') {
        console.warn(`[SocketHook] Context pruned for thread ${data.payload.threadId}: ${data.payload.prunedCount} messages removed.`);
      }
    };

    const onNativeNotification = (data: any) => {
      console.log(`[SocketHook] Native Notification:`, data);
      if ((window as any).electron) {
        (window as any).electron.notify(data.title, data.body);
      }
    };

    const handleToolUpdate = (data: any, isResult: boolean) => {
      let targetProjectId = data.projectId;
      let targetThreadId = data.threadId || activeThreadId;

      // Locate Project if missing
      if (!targetProjectId && targetThreadId) {
        const p = projects.find(p => p.threads?.some((t: any) => t.id === targetThreadId));
        if (p) targetProjectId = p.id;
      }
      if (!targetProjectId && projects.length > 0) targetProjectId = projects[0].id;

      if (targetProjectId && targetThreadId) {
        const project = projects.find(p => p.id === targetProjectId);
        const thread = project?.threads?.find((t: any) => t.id === targetThreadId);
        
        if (thread) {
           let messageIndex = -1;
           // Try to find the message containing this toolCallId
           if (data.toolCallId) {
               messageIndex = thread.messages.findIndex((m: any) => m.toolCalls?.some((tc: any) => tc.id === data.toolCallId));
           }
           // Fallback to last message if not found (brittle but backward compatible)
           if (messageIndex === -1) messageIndex = thread.messages.length - 1;

           if (messageIndex !== -1) {
             const updates: any = { status: data.status };
             if (isResult) {
               updates.result = data.result;
               updates.error = data.error;
             } else {
               updates.arguments = data.args;
             }
             
             updateToolCall(targetProjectId, targetThreadId, messageIndex, data.toolCallId || data.tool, updates);
           }
        }
      }
    };

    const onToolExecution = (data: any) => {
      console.log(`[SocketHook] Tool Execution:`, data);
      handleToolUpdate(data, false);
    };

    const onToolResult = (data: any) => {
      console.log(`[SocketHook] Tool Result:`, data);
      handleToolUpdate(data, true);
    };

    const onProjectListUpdate = (data: { projects: any[] }) => {
      console.log(`[SocketHook] Project List Update:`, data);
      useHiveStore.getState().setProjects(data.projects);
    };

    const onDiffUpdate = (data: { file: string; added: number; removed: number }) => {
      console.log(`[SocketHook] Diff Update:`, data);
      const state = useHiveStore.getState();
      const projectId = state.selectedProjectId;
      if (projectId) {
        state.setProjects(
          state.projects.map(p =>
            p.id === projectId
              ? { ...p, lastDiff: { file: data.file, added: data.added, removed: data.removed, timestamp: Date.now() } }
              : p
          )
        );
      }
      useHiveStore.setState({ lastEvent: 'DIFF_UPDATE' });
    };

    const onFileChange = (data: { filePath: string; relativePath: string; projectPath: string; timestamp: number }) => {
      console.log(`[SocketHook] File Change:`, data);
      const state = useHiveStore.getState();
      const projectId = state.selectedProjectId;
      if (projectId) {
        state.setProjects(
          state.projects.map(p =>
            p.id === projectId
              ? { ...p, lastFileChange: { path: data.relativePath || data.filePath, timestamp: data.timestamp } }
              : p
          )
        );
      }
      useHiveStore.setState({ lastEvent: 'FILE_CHANGE' });
    };

    socket.on('QUEEN_STATUS', onQueenStatus);
    socket.on('UI_UPDATE', onUIUpdate);
    socket.on('NATIVE_NOTIFICATION', onNativeNotification);
    socket.on('TOOL_EXECUTION', onToolExecution);
    socket.on('TOOL_RESULT', onToolResult);
    socket.on('PROJECT_LIST_UPDATE', onProjectListUpdate);
    socket.on('DIFF_UPDATE', onDiffUpdate);
    socket.on('FILE_CHANGE', onFileChange);

    return () => {
      socket.off('QUEEN_STATUS', onQueenStatus);
      socket.off('UI_UPDATE', onUIUpdate);
      socket.off('NATIVE_NOTIFICATION', onNativeNotification);
      socket.off('TOOL_EXECUTION', onToolExecution);
      socket.off('TOOL_RESULT', onToolResult);
      socket.off('PROJECT_LIST_UPDATE', onProjectListUpdate);
      socket.off('DIFF_UPDATE', onDiffUpdate);
      socket.off('FILE_CHANGE', onFileChange);
    };
  }, [socket, setQueenStatus, updateAgentStatus, spawnAgent, updateToolCall, activeThreadId, projects]);
};
