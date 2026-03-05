// Backward-compatibility re-export: TimeTrackingContext is now ResourceMonitorContext
// All consumers should migrate to useResourceMonitor from ResourceMonitorContext.js
import { ResourceMonitorProvider, useResourceMonitor } from "./ResourceMonitorContext";

export const TimeTrackingProvider = ResourceMonitorProvider;
export const useTimeTracking = useResourceMonitor;

