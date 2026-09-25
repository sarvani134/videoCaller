import React, { useEffect, useRef, useState } from 'react'

function Simple() {
    const [connected,setConnected]=useState(false)
    const [participants,setParticipants]=useState([])
    const [mediaError,setMediaError]=useState(false)
    const remoteVideoRef=useRef(null)
    const localVideoRef=useRef(null)
    const peerConnectionRef=useRef(null)
    useEffect(()=>{
        let localStream=null
        let cancelled=null
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
        // we will send ur data first

        localStream.getTracks().forEach((track)=>{
            peerConnection.addTrack(track,localStream)
        })
        //  we will receive their data

        peerConnection.ontrack=(event)=>{
            if(remoteVideoRef.current){
                remoteVideoRef.current.srcObject=event.streams[0]
            }
        }
            // when we select the ice candidate 
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
const startStream=async()=>{
        try{
            const stream=await navigator.mediaDevices.getUserMedia({
                video:true,
                audio:true
            })

            if(cancelled){
                stream.getTracks().forEach((track)=>{
                    track.stop()
                })
                return false
            }
           localStream=stream 
           if(localVideoRef.current){
            localVideoRef.current.srcObject=localStream
           }


        }
        catch(err){
            console.log(err)
        }
    }
    socket.on("connect",()=>{
        setConnected(true)
        if(isHost){
                socket.emit("create-room",roomId)
        }
        else{
                socket.emit("join-room",roomId)
        }
    })

   
     },[])

     const toggleVideo=async()=>{

        if(!isVideoOff){
            stream.getVideoTracks().forEach((track)=>{
                track.stop()
            })
            setIsVideoOff(true)
                return
        }
        let newTrack
        if(!stream){
            return
        }
       cameraStream=await navigator.mediaDevices.getUserMedia({
            video:true,
            audio:true
        })
        newTrack=await cameraStream.getVideoTracks()[0]

        if(localStreamRef?.current!=stream){
            newTrack.stop()
            return
        }

        const videoSender=peerConnectionRef.current.getSenders()
        .find((sender)=>sender.track?.kind=="video")
        if(videoSender){
            await videoSender.replaceTrack(newTrack)
        }

        stream.getVideoTracks().forEach((track)=>{
            stream.removeTrack(track)
        })
        stream.addTrack(newTrack)
        localStreamRef.current=stream

     }
        
     const startStream=async()=>{

        try{
                const stream=await navigator.mediaDevices.getUserMedia({
                    audio:true,
                    video:true
                })
                

        }
        catch(err){

        }
     }
    



   
  return (
    <div>
      
    </div>
  )
}

export default Simple
