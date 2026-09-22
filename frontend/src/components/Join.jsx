import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Join() {
  let [roomId,setRoomId]=useState('')
  const navigate=useNavigate()

  const handleJoin=()=>{
     console.log(roomId)
     const trimmedRoomId=roomId.trim()
     if(trimmedRoomId==''){
      return
     }
  navigate(`/meeting/${trimmedRoomId}`,{state:{isHost:false}})
  }
  return (
    <div>
      <h1>Join meeting</h1>
      <input 
      placeholder='enter the room ID'
      type='text'
      value={roomId}
      onChange={(e)=>setRoomId(e.target.value)}
      />

      <button onClick={()=>handleJoin()}>Join</button>
      
    </div>
  )
}

export default Join
