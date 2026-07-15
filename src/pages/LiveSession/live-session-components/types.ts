export interface RemoteParticipant {
  uid: string | number;
  name: string;
  videoTrack?: import('agora-rtc-sdk-ng').IRemoteVideoTrack;
  audioTrack?: import('agora-rtc-sdk-ng').IRemoteAudioTrack;
  hasVideo: boolean;
  hasAudio: boolean;
}

/**
 * Tin nhắn chat trong buổi học. Chỉ sống trong phiên RTC,
 * KHÔNG lưu xuống DB — mất khi rời phòng.
 */
export interface ChatMessage {
  id: string;
  senderUid: string | number;
  senderName: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
}

export type LiveSessionErrorKind = 'not-open' | 'ended' | 'forbidden' | 'not-found' | 'media' | 'unknown';

export interface LiveSessionError {
  kind: LiveSessionErrorKind;
  message: string;
}
