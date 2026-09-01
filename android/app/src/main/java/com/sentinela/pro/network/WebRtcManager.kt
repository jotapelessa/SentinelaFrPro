package com.sentinela.pro.network

import android.content.Context
import android.util.Log
import io.ktor.client.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import org.webrtc.*

class WebRtcManager(private val context: Context, private val go2rtcUrl: String) {
    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private val client = HttpClient(OkHttp)
    
    private val eglBase = EglBase.create()
    val eglBaseContext: EglBase.Context get() = eglBase.eglBaseContext

    init {
        val initializationOptions = PeerConnectionFactory.InitializationOptions.builder(context)
            .setEnableInternalTracer(true)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(initializationOptions)

        val options = PeerConnectionFactory.Options()
        val defaultVideoEncoderFactory = DefaultVideoEncoderFactory(eglBaseContext, true, true)
        val defaultVideoDecoderFactory = DefaultVideoDecoderFactory(eglBaseContext)

        peerConnectionFactory = PeerConnectionFactory.builder()
            .setOptions(options)
            .setVideoEncoderFactory(defaultVideoEncoderFactory)
            .setVideoDecoderFactory(defaultVideoDecoderFactory)
            .createPeerConnectionFactory()
    }

    suspend fun startStream(cameraName: String, surfaceViewRenderer: SurfaceViewRenderer) {
        surfaceViewRenderer.init(eglBaseContext, null)
        
        val rtcConfig = PeerConnection.RTCConfiguration(emptyList())
        rtcConfig.sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN

        peerConnection = peerConnectionFactory?.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onIceCandidate(candidate: IceCandidate) {}
            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
            override fun onSignalingChange(newState: PeerConnection.SignalingState?) {}
            override fun onIceConnectionChange(newState: PeerConnection.IceConnectionState?) {}
            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(newState: PeerConnection.IceGatheringState?) {}
            override fun onDataChannel(dataChannel: DataChannel?) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddTrack(receiver: RtpReceiver?, mediaStreams: Array<out MediaStream>?) {
                val track = receiver?.track()
                if (track is VideoTrack) {
                    track.addSink(surfaceViewRenderer)
                }
            }
            override fun onRemoveStream(stream: MediaStream?) {}
            override fun onAddStream(stream: MediaStream?) {}
        })

        // 1. Create Offer
        peerConnection?.addTransceiver(MediaStreamTrack.MediaType.MEDIA_TYPE_VIDEO, 
            RtpTransceiver.RtpTransceiverInit(RtpTransceiver.RtpTransceiverDirection.RECV_ONLY))
        
        peerConnection?.createOffer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription) {
                peerConnection?.setLocalDescription(this, sdp)
                // 2. Send Offer to go2rtc
                sendOfferToGo2Rtc(cameraName, sdp.description)
            }
            override fun onSetSuccess() {}
            override fun onCreateFailure(s: String?) {}
            override fun onSetFailure(s: String?) {}
        }, MediaConstraints())
    }

    private fun sendOfferToGo2Rtc(cameraName: String, offerSdp: String) {
        kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            try {
                // go2rtc WebRTC API requires raw SDP in body, returns answer SDP
                val url = "http://$go2rtcUrl:1984/api/webrtc?src=$cameraName"
                val response: HttpResponse = client.post(url) {
                    setBody(offerSdp)
                }
                val answerSdp = response.bodyAsText()
                
                // 3. Set Remote Answer
                peerConnection?.setRemoteDescription(object : SdpObserver {
                    override fun onCreateSuccess(p0: SessionDescription?) {}
                    override fun onSetSuccess() {}
                    override fun onCreateFailure(p0: String?) {}
                    override fun onSetFailure(p0: String?) {}
                }, SessionDescription(SessionDescription.Type.ANSWER, answerSdp))
                
            } catch (e: Exception) {
                Log.e("WebRtcManager", "Failed to negotiate WebRTC: ${e.message}")
            }
        }
    }

    fun release() {
        peerConnection?.close()
        peerConnection = null
    }
}
