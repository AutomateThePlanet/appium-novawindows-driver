export interface ServerRequest {
    id: number;
    method: string;
    params: Record<string, unknown>;
}

export interface ServerResponse {
    id: number;
    result?: unknown;
    error?: {
        code: string;
        message: string;
    };
    duration_ms: number;
}

export interface ConditionDto {
    type: 'property' | 'and' | 'or' | 'not' | 'true' | 'false';
    property?: string;
    value?: unknown;
    conditions?: ConditionDto[];
    condition?: ConditionDto;
}

export interface RectResult {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PingResult {
    status: string;
    uptimeSeconds: number;
    elementCount: number;
    hasRootElement: boolean;
}

export interface ElementTableEntry {
    runtimeId: string;
    name: string;
    controlType: string;
    isAlive: boolean;
}
