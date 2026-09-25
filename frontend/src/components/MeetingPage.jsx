import { useEffect, useRef, useState } from "react"
import {
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom"

import { io } from "socket.io-client"
import ChatWindow from "./ChatWindow"

function MediaStatus({ muted, videoOff }) {
  return (
    <div className="meeting-media-status" role="status">
      <span className={muted ? "media-disabled" : ""}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <rect x="9" y="2" width="6" height="13" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
          {muted && <path d="M3 21 21 3" stroke="#ff6677" strokeWidth="2.8" />}
        </svg>
        {muted ? "Muted" : "Mic on"}
      </span>
      <span className={videoOff ? "media-disabled" : ""}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="6" width="13" height="12" rx="3" />
          <path d="m15 10 7-4v12l-7-4z" />
          {videoOff && <path d="M3 21 21 3" stroke="#ff6677" strokeWidth="2.8" />}
        </svg>
        {videoOff ? "Camera off" : "Camera on"}
      </span>
    </div>
  )
}

function MeetingPage() {

  const { roomId } = useParams()

  const location = useLocation()
  const navigate = useNavigate()

  const isHost = location.state?.isHost

  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState([])
  const [mediaError, setMediaError] = useState("")
  const [isMuted,setIsMuted]=useState(false)
  const [isVideoOff,setIsVideoOff]=useState(false)
  const hasOtherParticipant = participants.length > 1
  const [remoteVideoOff, setRemoteVideoOff] = useState(false)
  const [remoteMuted, setRemoteMuted] = useState(false)
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [localVideoReady, setLocalVideoReady] = useState(false)
  const [copyStatus, setCopyStatus] = useState(null)
  const copySequence = useRef(0)

  useEffect(() => {
    if (!copyStatus || copyStatus.error) return
    const timer = setTimeout(() => setCopyStatus(null), 4000)
    return () => clearTimeout(timer)
  }, [copyStatus])
  let [showChatWindow,setShowChatWindow]=useState(false)
  const [messages,setMessages]=useState([])
  const [message,setMessage]=useState("")
  const chatToggleRef = useRef(null)
  const closeChat = () => {
    setShowChatWindow(false)
    chatToggleRef.current?.focus()
  }
  const placeholderImage = `${import.meta.env.BASE_URL}placeholderImg.png`

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopyStatus({ id: ++copySequence.current, error: false })
    } catch {
      setCopyStatus({ id: ++copySequence.current, error: true })
    }
  }

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const socketRef=useRef(null)
  const localStreamRef=useRef(null)

  const peerConnectionRef = useRef(null)

    const toggleMute=()=>{
      const stream=localStreamRef.current
      if(!stream){
        return
      }
      let newMutedState=!isMuted
      stream.getAudioTracks().forEach((track)=>{
        track.enabled=!newMutedState
      })

      setIsMuted(newMutedState)
      socketRef.current?.emit("mute-state", newMutedState)
    }

    const toggleVideo = async () => {
  const stream = localStreamRef.current
  if (!stream) return

  if (!isVideoOff) {
    // Stop camera capture; microphone keeps working.
    stream.getVideoTracks().forEach((track) => {
      track.stop()
    })

    setIsVideoOff(true)
    socketRef.current?.emit("video-state", true)
    return
  }

  let newTrack

  try {
    // A stopped track cannot restart, so request a new one.
    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    })

    newTrack = cameraStream.getVideoTracks()[0]

    // Release the new camera if the call ended while waiting.
    if (localStreamRef.current !== stream) {
      newTrack.stop()
      return
    }

    const videoSender = peerConnectionRef.current
      ?.getSenders()
      .find((sender) => sender.track?.kind === "video")

    if (videoSender) {
      await videoSender.replaceTrack(newTrack)
    }

    // Update the existing stream used by the local preview.
    stream.getVideoTracks().forEach((track) => {
      stream.removeTrack(track)
    })
    stream.addTrack(newTrack)

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }

    setMediaError("")
    setIsVideoOff(false)
    socketRef.current?.emit("video-state", false)
  } catch (error) {
    newTrack?.stop()
    setMediaError("Unable to turn the camera on. Check camera permissions.")
    console.error("Camera restart failed:", error)
  }
}

    const endCall=()=>{
     if(localStreamRef.current)
      { localStreamRef.current.getTracks()
      .forEach((track)=>{
        track.stop()
      })
      localStreamRef.current=null
     
    }
     if(socketRef.current){ 
      
      socketRef.current.disconnect()
      socketRef.current=null
    
    }

    if(peerConnectionRef.current){
       peerConnectionRef.current.close()
      peerConnectionRef.current=null
     
    }
     navigate("/")

    }

    const sendMessage=(text)=>{
        const trimmedText=text.trim()
        if(trimmedText==""){
          return
        }
        if(!socketRef.current?.connected){
          return
        }

        socketRef.current.emit("chat-message",trimmedText,isHost?"Host":"Participant")
        setMessage("")
      }
  useEffect(() => {

    let localStream = null
    let cancelled = false


    // -----------------------------------------
    // SOCKET
    // -----------------------------------------

    const socket = io(
      import.meta.env.VITE_BACKEND_URL,
      {
        autoConnect: false
      }
    )
    socketRef.current=socket
    socket.on("video-state", (participantId, videoOff) => {
      if (participantId !== socket.id) setRemoteVideoOff(videoOff)
    })
    socket.on("mute-state", (participantId, muted) => {
      if (participantId !== socket.id) setRemoteMuted(muted)
    })
      

    // -----------------------------------------
    // CREATE WEBRTC CONNECTION
    // -----------------------------------------

    const createPeerConnection = (remoteSocketId) => {

      console.log(
        "Creating peer connection with:",
        remoteSocketId
      )


      const peerConnection =
        new RTCPeerConnection({

          iceServers: [
            {
              urls:
                "stun:stun.l.google.com:19302"
            }
          ]

        })


      peerConnectionRef.current =
        peerConnection


      // -----------------------------------------
      // SEND MY CAMERA + MICROPHONE
      // -----------------------------------------

      localStream
        .getTracks()
        .forEach((track) => {

          peerConnection.addTrack(
            track,
            localStream
          )

        })


      // -----------------------------------------
      // RECEIVE REMOTE CAMERA + MICROPHONE
      // -----------------------------------------

      peerConnection.ontrack =
        (event) => {

          console.log(
            "Remote stream received"
          )

          if (remoteVideoRef.current) {

            remoteVideoRef.current.srcObject =
              event.streams[0]

          }

        }


      // -----------------------------------------
      // SEND ICE CANDIDATES
      // -----------------------------------------

      peerConnection.onicecandidate =
        (event) => {

          if (event.candidate) {

            console.log(
              "Sending ICE candidate"
            )


            socket.emit(
              "signal",
              remoteSocketId,
              {
                type: "candidate",
                candidate:
                  event.candidate
              }
            )

          }

        }


      return peerConnection
    }



    // -----------------------------------------
    // CAMERA + MICROPHONE
    // -----------------------------------------

    const startStream = async () => {

      try {

        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              video: true,
              audio: true
            })


        if (cancelled) {

          stream
            .getTracks()
            .forEach((track) => {

              track.stop()

            })

          return false
        }


        localStream = stream
        localStreamRef.current=localStream


        console.log(
          "Camera and microphone stream:",
          localStream
        )


        if (localVideoRef.current) {

          localVideoRef.current.srcObject =
            localStream

        }


        return true

      }

      catch (err) {

        if (cancelled) {
          return false
        }


        console.error(
          "Camera/Microphone error:",
          err
        )


        const messages = {

          NotAllowedError:
            "Please allow camera and microphone access.",

          NotFoundError:
            "Camera or microphone was not found.",

          NotReadableError:
            "Unable to access your camera or microphone. Check whether another app is using them."

        }


        setMediaError(
          messages[err.name] ||
          "Unable to start camera or microphone."
        )


        return false
      }

    }



    // -----------------------------------------
    // SOCKET CONNECTED
    // -----------------------------------------

    socket.on(
      "connect",
      () => {

        console.log(
          "Connected with socket ID:",
          socket.id
        )


        setConnected(true)


        if (isHost) {

          console.log(
            "Creating room:",
            roomId
          )


          socket.emit(
            "create-room",
            roomId
          )

        }

        else {

          console.log(
            "Joining room:",
            roomId
          )


          socket.emit(
            "join-call",
            roomId
          )

        }

      }
    )

        socket.on("chat-message",(data,sender,senderSocketId)=>{
           const newMessage = {
      data,
      sender,
      socketId: senderSocketId,
      isOwn: senderSocketId === socket.id
    }

    setMessages((prev) => [
      ...prev,
      newMessage
    ])
  
        })


    // -----------------------------------------
    // ROOM CREATED
    // -----------------------------------------

    socket.on(
      "room-created",
      (createdRoomId) => {

        console.log(
          "Room successfully created:",
          createdRoomId
        )

      }
    )



    // -----------------------------------------
    // ROOM ERROR
    // -----------------------------------------

    socket.on(
      "room-error",
      (message) => {

        console.log(
          "Room error:",
          message
        )


        alert(message)

        navigate("/")

      }
    )



    // -----------------------------------------
    // NEW USER
    // -----------------------------------------

    socket.on(
      "new-user",
      async (newUserId, users) => {

        console.log(
          "New user:",
          newUserId
        )

        console.log(
          "Users:",
          users
        )


        setParticipants([...users])
        // Publish the current tracks, including when joining or reconnecting.
        socket.emit("mute-state", localStream.getAudioTracks().every(track => !track.enabled))
        socket.emit("video-state", localStream.getVideoTracks().every(track => track.readyState === "ended" || !track.enabled))


        // The server also sends new-user
        // to the newly joined user.
        //
        // That user should NOT create
        // an offer to itself.

        if (newUserId === socket.id) {
          return
        }


        try {

          const peerConnection =
            createPeerConnection(
              newUserId
            )


          // -----------------------------
          // CREATE OFFER
          // -----------------------------

          const offer =
            await peerConnection
              .createOffer()


          await peerConnection
            .setLocalDescription(
              offer
            )


          console.log(
            "Sending offer to:",
            newUserId
          )


          socket.emit(
            "signal",
            newUserId,
            {
              type: "offer",
              offer: offer
            }
          )

        }

        catch (error) {

          console.error(
            "Offer creation error:",
            error
          )

        }

      }
    )



    // -----------------------------------------
    // WEBRTC SIGNALING
    // -----------------------------------------

    socket.on(
      "signal",
      async (fromId, message) => {

        console.log(
          "Signal received:",
          message.type,
          "from:",
          fromId
        )


        try {

          // =============================
          // OFFER RECEIVED
          // =============================

          if (
            message.type === "offer"
          ) {

            console.log(
              "Offer received from:",
              fromId
            )


            const peerConnection =
              createPeerConnection(
                fromId
              )


            // Other person's offer
            await peerConnection
              .setRemoteDescription(
                message.offer
              )


            // Create my response
            const answer =
              await peerConnection
                .createAnswer()


            await peerConnection
              .setLocalDescription(
                answer
              )


            console.log(
              "Sending answer to:",
              fromId
            )


            socket.emit(
              "signal",
              fromId,
              {
                type: "answer",
                answer: answer
              }
            )

          }



          // =============================
          // ANSWER RECEIVED
          // =============================

          else if (
            message.type === "answer"
          ) {

            console.log(
              "Answer received from:",
              fromId
            )


            if (
              peerConnectionRef.current
            ) {

              await peerConnectionRef.current
                .setRemoteDescription(
                  message.answer
                )

            }

          }



          // =============================
          // ICE CANDIDATE RECEIVED
          // =============================

          else if (
            message.type ===
            "candidate"
          ) {

            console.log(
              "ICE candidate received from:",
              fromId
            )


            if (
              peerConnectionRef.current
            ) {

              await peerConnectionRef.current
                .addIceCandidate(
                  message.candidate
                )

            }

          }

        }

        catch (error) {

          console.error(
            "WebRTC signaling error:",
            error
          )

        }

      }
    )



    // -----------------------------------------
    // USER LEFT
    // -----------------------------------------

    socket.on(
      "user-left",
      (socketId) => {
        setRemoteVideoOff(false)
        setRemoteMuted(false)
        setRemoteVideoReady(false)

        console.log(
          "User left:",
          socketId
        )

        setParticipants(
          (prev) =>
            prev.filter(
              (id) =>
                id !== socketId
            )
        )


        if (
          peerConnectionRef.current
        ) {

          peerConnectionRef.current
            .close()

          peerConnectionRef.current =
            null

        }


        if (
          remoteVideoRef.current
        ) {

          remoteVideoRef.current.srcObject =
            null

        }

      }
    )



    // -----------------------------------------
    // SOCKET DISCONNECTED
    // -----------------------------------------

    socket.on(
      "disconnect",
      () => {

        console.log(
          "Disconnected from server"
        )

        setConnected(false)

      }
    )



    // -----------------------------------------
    // START EVERYTHING
    // -----------------------------------------

    const startMeeting = async () => {

      const mediaStarted =
        await startStream()


      if (
        !mediaStarted ||
        cancelled
      ) {
        return
      }


      // Only connect to socket AFTER
      // camera/mic is ready.

      socket.connect()

    }


    startMeeting()



    // -----------------------------------------
    // CLEANUP
    // -----------------------------------------

    return () => {

      cancelled = true


      socket.disconnect()


      if (
        peerConnectionRef.current
      ) {

        peerConnectionRef.current
          .close()

        peerConnectionRef.current =
          null

      }


      if (localStream) {

        localStream
          .getTracks()
          .forEach((track) => {

            track.stop()

          })

      }

    }

  }, [roomId, isHost, navigate])



  return (

    <div className={`meeting ${hasOtherParticipant ? "meeting-split" : "meeting-solo"}`}>

      {mediaError && (
        <p>
          {mediaError}
        </p>
      )}


      <h1>
        Meeting Room
      </h1>


      {isHost && <p className="meeting-room-id">
        <span>Room ID: <strong>{roomId}</strong></span>
        <button type="button" className="meeting-copy" onClick={copyRoomId} aria-label="Copy room ID" title="Copy room ID">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="8" y="8" width="12" height="13" rx="2" />
            <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </p>}

      <div className="meeting-toast-region" role="status" aria-live="polite" aria-atomic="true">
        {copyStatus && (
          <div key={copyStatus.id} className={`meeting-toast${copyStatus.error ? " meeting-toast-error" : ""}`}>
            <span className="meeting-toast-icon" aria-hidden="true">{copyStatus.error ? "!" : "🎉"}</span>
            <div className="meeting-toast-message">
              <strong>{copyStatus.error ? "Couldn't copy the room ID" : "Room ID successfully copied!"}</strong>
              <span>{copyStatus.error ? "Select the room ID and copy it manually." : "Paste it, invite your people, and let’s connect."}</span>
            </div>
            <button type="button" className="meeting-toast-close" aria-label="Dismiss notification" onClick={() => setCopyStatus(null)}>×</button>
            {!copyStatus.error && <span className="meeting-toast-progress" aria-hidden="true" />}
          </div>
        )}
      </div>


      <p>

        Status:

        {connected
          ? " Connected"
          : " Disconnected"
        }

      </p>


      <p>
        Participants:
        {" "}
        {participants.length}
      </p>



      <h2>
        Your Camera
      </h2>


      <section className="meeting-video" aria-label="Your camera">
      <video
        ref={localVideoRef}
        onPlaying={() => setLocalVideoReady(true)}
        autoPlay
        muted
        playsInline
        style={{
          width: "400px",
          maxWidth: "100%",
          background: "black"
        }}
      />
      {(isVideoOff || !localVideoReady) && <img className="meeting-placeholder" src={placeholderImage} alt={isVideoOff ? "Your camera is off" : "Waiting for your camera"} />}
      <MediaStatus muted={isMuted} videoOff={isVideoOff} />
      </section>
    <div className="meeting-controls">

  <button
    type="button"
    title={isMuted ? "Unmute microphone" : "Mute microphone"}
    onClick={toggleMute}
  >
    {isMuted && <span className="meeting-control-slash" aria-hidden="true" />}
    {isMuted
      ? "Unmute"
      : "Mute"}
  </button>


  <button
    type="button"
    title={isVideoOff ? "Turn camera on" : "Turn camera off"}
    onClick={toggleVideo}
  >
    {isVideoOff && <span className="meeting-control-slash" aria-hidden="true" />}
    {isVideoOff
      ? "Turn Video On"
      : "Turn Video Off"}
  </button>
  <button
  ref={chatToggleRef}
  type="button"
  aria-expanded={showChatWindow}
  aria-controls="meeting-chat"
  onClick={() =>
    setShowChatWindow((prev) => !prev)
  }
>
  {showChatWindow
    ? "Close Chat"
    : "Chat"}
</button>

  <button
    onClick={endCall}
  >
    End Call
  </button>

</div>

      {showChatWindow && (
        <ChatWindow
          messages={messages}
          message={message}
          onMessageChange={setMessage}
          onSend={sendMessage}
          onClose={closeChat}
          connected={connected}
        />
      )}


      <h2 hidden={!hasOtherParticipant}>
        Other Participant
      </h2>


      <section className="meeting-video" hidden={!hasOtherParticipant} aria-label="Other participant camera">
      <video
        ref={remoteVideoRef}
        onPlaying={() => setRemoteVideoReady(true)}
        autoPlay
        playsInline
        style={{
          width: "400px",
          maxWidth: "100%",
          background: "black"
        }}
      />
      {(remoteVideoOff || !remoteVideoReady) && <img className="meeting-placeholder" src={placeholderImage} alt={remoteVideoOff ? "Participant camera is off" : "Waiting for participant camera"} />}
      <MediaStatus muted={remoteMuted} videoOff={remoteVideoOff} />
      </section>

    </div>

  )
}

export default MeetingPage
