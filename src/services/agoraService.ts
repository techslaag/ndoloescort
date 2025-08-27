import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  ConnectionState,
  UID
} from 'agora-rtc-sdk-ng'

// Configure Agora SDK
AgoraRTC.setLogLevel(0) // 0: DEBUG, 1: INFO, 2: WARNING, 3: ERROR, 4: NONE

export interface AgoraConfig {
  appId: string
  token?: string | null
  channel: string
  uid?: UID
}

export interface CallStats {
  duration: number
  sendBitrate: number
  recvBitrate: number
  sendPacketLossRate: number
  recvPacketLossRate: number
  networkQuality: 'excellent' | 'good' | 'poor' | 'bad' | 'veryBad' | 'down'
}

export class AgoraService {
  private client: IAgoraRTCClient | null = null
  private localAudioTrack: IMicrophoneAudioTrack | null = null
  private localVideoTrack: ICameraVideoTrack | null = null
  private remoteUsers: Map<UID, IAgoraRTCRemoteUser> = new Map()
  
  // Event callbacks
  public onUserJoined?: (user: IAgoraRTCRemoteUser) => void
  public onUserLeft?: (user: IAgoraRTCRemoteUser) => void
  public onUserPublished?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void
  public onUserUnpublished?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void
  public onConnectionStateChange?: (state: ConnectionState) => void
  public onNetworkQuality?: (stats: CallStats) => void
  public onError?: (error: Error) => void

  constructor() {
    // Initialize client in constructor
    this.client = AgoraRTC.createClient({
      mode: 'rtc',
      codec: 'vp8'
    })
    
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    if (!this.client) return

    // User events
    this.client.on('user-joined', (user) => {
      console.log('User joined:', user.uid)
      this.remoteUsers.set(user.uid, user)
      this.onUserJoined?.(user)
    })

    this.client.on('user-left', (user) => {
      console.log('User left:', user.uid)
      this.remoteUsers.delete(user.uid)
      this.onUserLeft?.(user)
    })

    this.client.on('user-published', async (user, mediaType) => {
      console.log('User published:', user.uid, mediaType)
      await this.client!.subscribe(user, mediaType)
      this.onUserPublished?.(user, mediaType)
    })

    this.client.on('user-unpublished', (user, mediaType) => {
      console.log('User unpublished:', user.uid, mediaType)
      this.onUserUnpublished?.(user, mediaType)
    })

    // Connection state
    this.client.on('connection-state-change', (curState, prevState) => {
      console.log('Connection state changed:', prevState, '->', curState)
      this.onConnectionStateChange?.(curState)
    })

    // Network quality
    this.client.on('network-quality', (stats) => {
      const quality = this.mapNetworkQuality(stats.uplinkNetworkQuality)
      this.onNetworkQuality?.({
        duration: 0,
        sendBitrate: 0,
        recvBitrate: 0,
        sendPacketLossRate: 0,
        recvPacketLossRate: 0,
        networkQuality: quality
      })
    })

    // Errors
    this.client.on('error', (error) => {
      console.error('Agora error:', error)
      this.onError?.(error)
    })
  }

  private mapNetworkQuality(quality: number): CallStats['networkQuality'] {
    switch (quality) {
      case 1: return 'excellent'
      case 2: return 'good'
      case 3: return 'poor'
      case 4: return 'bad'
      case 5: return 'veryBad'
      default: return 'down'
    }
  }

  async join(config: AgoraConfig): Promise<void> {
    if (!this.client) {
      throw new Error('Agora client not initialized')
    }

    try {
      // Join the channel
      const uid = await this.client.join(
        config.appId,
        config.channel,
        config.token || null,
        config.uid || null
      )
      
      console.log('Joined channel with UID:', uid)
    } catch (error) {
      console.error('Failed to join channel:', error)
      throw error
    }
  }

  async leave(): Promise<void> {
    try {
      // Stop and close local tracks
      if (this.localAudioTrack) {
        this.localAudioTrack.stop()
        this.localAudioTrack.close()
        this.localAudioTrack = null
      }

      if (this.localVideoTrack) {
        this.localVideoTrack.stop()
        this.localVideoTrack.close()
        this.localVideoTrack = null
      }

      // Leave the channel
      if (this.client) {
        await this.client.leave()
        console.log('Left channel')
      }

      // Clear remote users
      this.remoteUsers.clear()
    } catch (error) {
      console.error('Failed to leave channel:', error)
      throw error
    }
  }

  async createLocalTracks(audio: boolean = true, video: boolean = true): Promise<void> {
    try {
      const tracks: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = []

      if (audio) {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          AEC: true, // Acoustic echo cancellation
          ANS: true, // Automatic noise suppression
          AGC: true  // Automatic gain control
        })
        tracks.push(this.localAudioTrack)
      }

      if (video) {
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: '720p_2',
          optimizationMode: 'balanced'
        })
        tracks.push(this.localVideoTrack)
      }

      // Publish tracks
      if (this.client && tracks.length > 0) {
        await this.client.publish(tracks)
        console.log('Published local tracks')
      }
    } catch (error) {
      console.error('Failed to create local tracks:', error)
      throw error
    }
  }

  // Track control methods
  async muteAudio(mute: boolean): Promise<void> {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(!mute)
    }
  }

  async muteVideo(mute: boolean): Promise<void> {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(!mute)
    }
  }

  async switchCamera(): Promise<void> {
    if (this.localVideoTrack) {
      const devices = await AgoraRTC.getCameras()
      if (devices.length > 1) {
        const currentDevice = this.localVideoTrack.getTrackLabel()
        const nextDevice = devices.find(d => d.label !== currentDevice)
        if (nextDevice) {
          await this.localVideoTrack.setDevice(nextDevice.deviceId)
        }
      }
    }
  }

  // Get tracks for UI
  getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack
  }

  getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack
  }

  getRemoteUsers(): IAgoraRTCRemoteUser[] {
    return Array.from(this.remoteUsers.values())
  }

  getRemoteUser(uid: UID): IAgoraRTCRemoteUser | undefined {
    return this.remoteUsers.get(uid)
  }

  // Statistics
  async getCallStats(): Promise<CallStats> {
    if (!this.client) {
      throw new Error('Client not initialized')
    }

    const stats = await this.client.getRTCStats()
    const localAudioStats = this.localAudioTrack ? await this.client.getLocalAudioStats() : null
    const localVideoStats = this.localVideoTrack ? await this.client.getLocalVideoStats() : null

    return {
      duration: stats.Duration,
      sendBitrate: (localAudioStats?.sendBitrate || 0) + (localVideoStats?.sendBitrate || 0),
      recvBitrate: stats.RecvBitrate,
      sendPacketLossRate: localAudioStats?.sendPacketLossRate || 0,
      recvPacketLossRate: stats.RecvPacketLossRate,
      networkQuality: 'good' // Will be updated by network-quality event
    }
  }

  // Cleanup
  destroy(): void {
    this.leave()
    this.client = null
    this.remoteUsers.clear()
  }
}

// Singleton instance
export const agoraService = new AgoraService()