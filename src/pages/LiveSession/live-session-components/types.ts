export interface RemoteParticipant {
  uid: string | number;
  name: string;
  videoTrack?: import('agora-rtc-sdk-ng').IRemoteVideoTrack;
  audioTrack?: import('agora-rtc-sdk-ng').IRemoteAudioTrack;
  hasVideo: boolean;
  hasAudio: boolean;
}

export type LiveSessionErrorKind = 'not-open' | 'ended' | 'forbidden' | 'not-found' | 'media' | 'unknown';

export interface LiveSessionError {
  kind: LiveSessionErrorKind;
  message: string;
}
