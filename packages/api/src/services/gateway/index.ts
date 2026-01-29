export { GatewayClient, getGatewayClient, isChatEvent, isAgentEvent } from './client.js'
export type {
  EventFrame,
  ChatEvent,
  AgentEvent,
  SessionInfo,
  SessionsListParams,
  AgentInfo,
  AgentsListResult,
  AgentParams,
  HelloOk,
} from './protocol.js'
export { parseSessionKey } from './protocol.js'
