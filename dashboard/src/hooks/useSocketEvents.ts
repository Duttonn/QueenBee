import { useEffect } from 'react';
import { useHiveStore } from '../store/useHiveStore';

export const useSocketEvents = () => {
  const { socket, setQueenStatus, updateAgentStatus, spawnAgent } = useHiveStore();

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

    socket.on('QUEEN_STATUS', onQueenStatus);
    socket.on('UI_UPDATE', onUIUpdate);
    socket.on('NATIVE_NOTIFICATION', onNativeNotification);

    return () => {
      socket.off('QUEEN_STATUS', onQueenStatus);
      socket.off('UI_UPDATE', onUIUpdate);
      socket.off('NATIVE_NOTIFICATION', onNativeNotification);
    };
  }, [socket, setQueenStatus, updateAgentStatus, spawnAgent]);
};
