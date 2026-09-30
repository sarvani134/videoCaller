import { Server } from "socket.io";
 
let connections={}
const messages={}
const timeOnline={}
const pinnedMessages={}
const aiPermissions={}
export const socketConnection=(server)=>{
    // acts like a event listner whenever the user creates a socket this runs
    const io=new Server(server,{
        cors:{
            origin:["http://localhost:5173"],
            methods:["GET","POST"],
            credentials:true
            
        }
    })

        io.on("connection",(socket)=>{
            // when the hosts create the room
            socket.on("create-room",(path)=>{
                if(connections[path]!==undefined){
                       socket.emit("room-error", "Room already exists")
                    return 
                }
                // it will create something like 
                // connestcions=[
                //  {   path:["socketId"]  }
                // ]
                connections[path]=[]
                connections[path].push(socket.id)
                 timeOnline[socket.id]=new Date()
                 aiPermissions[path]=null
                 socket.data.roomId=path
                socket.emit("room-created", path)
                socket.emit("new-user", socket.id, connections[path])

            })
                    socket.on("set-ai-permission",(allowed)=>{
                        const roomId=socket.data.roomId
                        if(!roomId){
                            return
                        }
                        aiPermissions[roomId]=allowed
                     // we are sending to the user does the host gave them
                            // permission to use the ai chat or not 
    for (const participantId of connections[roomId]) {

        io.to(participantId).emit(
            "ai-permission",
            allowed
        )
    }

                    })

                // pinning a message
            socket.on("pin-message", (messageId) => {

    const [matchingRoom, found] =
        Object.entries(connections)
            .reduce(
                ([room, found], [roomKey, roomVal]) => {
                    if (!found && roomVal.includes(socket.id)) {
                        return [roomKey, true]
                    }

                    return [room, found]
                },
                ["", false]
            )

    if (!found) {
        return
    }

    const message =
        messages[matchingRoom]?.find(
            (msg) => msg.id === messageId
        )

    if (!message) {
        return
    }

    if (!pinnedMessages[matchingRoom]) {
        pinnedMessages[matchingRoom] = []
    }

    const alreadyPinned =
        pinnedMessages[matchingRoom]
            .some((msg) => msg.id === messageId)

    if (alreadyPinned) {
        return
    }

    pinnedMessages[matchingRoom].push(message)

    connections[matchingRoom].forEach(
        (participantId) => {
            io.to(participantId).emit(
                "message-pinned",
                message
            )
        }
    )
})

// unpin the message 
socket.on("unpin-message", (messageId) => {

    const [matchingRoom, found] =
        Object.entries(connections)
            .reduce(
                ([room, found], [roomKey, roomVal]) => {

                    if (!found && roomVal.includes(socket.id)) {
                        return [roomKey, true]
                    }

                    return [room, found]
                },
                ["", false]
            )

    if (!found) {
        return
    }

    if (!pinnedMessages[matchingRoom]) {
        return
    }

    pinnedMessages[matchingRoom] =
        pinnedMessages[matchingRoom]
            .filter(
                (msg) => msg.id !== messageId
            )

    connections[matchingRoom].forEach(
        (participantId) => {

            io.to(participantId).emit(
                "message-unpinned",
                messageId
            )

        }
    )
})

            socket.on("join-call",(path)=>{
                // participant does this 
                if(connections[path]==undefined){
                  socket.emit("room-error","room doesnt found or meeting has ended")
                  return
                }

                connections[path].push(socket.id)
                socket.data.roomId=path
                // there is a chance that user wont be joined when the 
                // host have sent a message regarding the permission of the 
                // ai chat window
                 socket.emit(
                "ai-permission",
                 aiPermissions[path] ?? false
                            )
                timeOnline[socket.id]=new Date()

                for (const participantId of connections[path]) {
                    if (participantId !== socket.id) {
                        socket.emit("video-state", participantId, io.sockets.sockets.get(participantId)?.data.videoOff === true)
                        socket.emit("mute-state", participantId, io.sockets.sockets.get(participantId)?.data.muted === true)
                    }
                }

                for(let i=0;i<connections[path].length;i++){
                    io.to(connections[path][i]).emit("new-user",socket.id,connections[path])
                }

                if(messages[path]!==undefined){
                    for(let i=0;i<messages[path].length;i++){
                        io.to(socket.id).emit("chat-message",messages[path][i]['data'],messages[path][i]['sender']
                            ,messages[path][i]['socket-id-sender'])
                    
                }
                }


            })

            socket.on("video-state", (videoOff) => {
                if (typeof videoOff !== "boolean") return
                const room = Object.values(connections).find(ids => ids.includes(socket.id))
                if (!room) return
                socket.data.videoOff = videoOff
                for (const participantId of room) {
                    if (participantId !== socket.id) {
                        io.to(participantId).emit("video-state", socket.id, videoOff)
                    }
                }
            })
                // when the user clicks on the mute button now it stores the mute state 
            socket.on("mute-state", (muted) => {
                if (typeof muted !== "boolean") return
                const room = Object.values(connections).find(ids => ids.includes(socket.id))
                if (!room) return
                socket.data.muted = muted

                    // this will send the mute state to the other participant , so that their front end
                    // will be changed for this user based the chosen value
                for (const participantId of room) {
                    if (participantId !== socket.id) {
                        io.to(participantId).emit("mute-state", socket.id, muted)
                    }
                }
            })

            socket.on("signal",(toId,message)=>{
                io.to(toId).emit("signal",socket.id,message)

            })

            socket.on("chat-message", (data, sender) => {

    const [matchingRoom, found] =
        Object.entries(connections)
            .reduce(
                ([room, found], [roomKey, roomVal]) => {

                    if (!found && roomVal.includes(socket.id)) {
                        return [roomKey, true]
                    }

                    return [room, found]

                },
                ["", false]
            )

    if (!found) {
        return
    }

    if (!messages[matchingRoom]) {
        messages[matchingRoom] = []
    }

    const newMessage = {
        id: crypto.randomUUID(),
        sender,
        data,
        socketId: socket.id
    }

    messages[matchingRoom].push(newMessage)

    connections[matchingRoom].forEach(
        (participantId) => {

            io.to(participantId).emit(
                "chat-message",
                newMessage
            )

        }
    )
})


            socket.on("disconnect",()=>{
                const duration=new Date()-timeOnline[socket.id]
                const seconds=duration/1000
                const minutes=(duration/1000)/60
                const [matchingRoom,found]=Object.entries(connections)
                .reduce(([room,found],[roomKey,roomVal])=>{
                    if(!found && roomVal.includes(socket.id)){
                        return [roomKey,true]
                    }


                    return [room,found]
                },['',false])
                    if(found){
                        connections[matchingRoom].forEach((socketId)=>{
                            io.to(socketId).emit("user-left",socket.id)
                        })

                        const index=connections[matchingRoom].indexOf(socket.id)
                        connections[matchingRoom].splice(index,1)
                        if(connections[matchingRoom].length===0){
                            delete connections[matchingRoom]
                        }
                    }


            })

        })


    return io


}
