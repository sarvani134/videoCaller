import { useEffect, useRef, useState } from "react"
import {
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom"

import { io } from "socket.io-client"

function MeetingPage() {

  const { roomId } = useParams()

  const location = useLocation()
  const navigate = useNavigate()

  const isHost = location.state?.isHost

  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState([])
  const [mediaError, setMediaError] = useState("")

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  const peerConnectionRef = useRef(null)


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

    <div>

      {mediaError && (
        <p>
          {mediaError}
        </p>
      )}


      <h1>
        Meeting Room
      </h1>


      <p>
        Room ID: {roomId}
      </p>


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


      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "400px",
          maxWidth: "100%",
          background: "black"
        }}
      />



      <h2>
        Other Participant
      </h2>


      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          width: "400px",
          maxWidth: "100%",
          background: "black"
        }}
      />

    </div>

  )
}

export default MeetingPage