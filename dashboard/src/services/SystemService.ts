import { ISystemService } from './interfaces/ISystemService';
import { ElectronAdapter } from './adapters/ElectronAdapter';
import { WebAdapter } from './adapters/WebAdapter';

const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;

export const systemService: ISystemService = isElectron 
  ? new ElectronAdapter() 
  : new WebAdapter();

// For backward compatibility during migration
export const SystemService = systemService;
export const NativeService = systemService;
