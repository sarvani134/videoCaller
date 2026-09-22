import React, { useEffect, useRef, useState } from 'react'

function Simple() {
    const [connected,setConnected]=useState(false)
    const [participants,setParticipants]=useState([])
    const [mediaError,setMediaError]=useState(false)
    const remoteVideoRef=useRef(null)
    const localVideoRef=useRef(null)
    const peerConnectionRef=useRef(null)
    useEffect(()=>{
         const socket=io("socked id",{
        autoConnect:false
    })

    const createPeerConnection=(remoteSocketId)=>{

        const peerConnection=new RTCPeerConnection({
            iceServers:[
                {
                    urls:""
                }
            ]
        })

        peerConnectionRef.current=peerConnection

        localStream.getTracks().forEach((track)=>{
            peerConnection.addTrack(track,localStream)
        })

        peerConnection.ontrack=(event)=>{
            if(remoteVideoRef.current){
                remoteVideoRef.current.srcObject=event.streams[0]
            }
        }

        peerConnection.onicecandidate=(event)=>{
            if(event.candidate){

                socket.emit("signal",remoteSocketId,{
                    type:"candidate",
                    candidate:event.candidate
                })
            }
        }
        
        return peerConnection
    }

    })

   
  return (
    <div>
      
    </div>
  )
}

export default Simple
