import { Server } from "socket.io";
 
let connections={}
const messages={}
const timeOnline={}
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
            socket.on("create-room",(path)=>{
                if(connections[path]!==undefined){
                       socket.emit("room-error", "Room already exists")
                    return 
                }
                connections[path]=[]
                connections[path].push(socket.id)
                 timeOnline[socket.id]=new Date()
                socket.emit("room-created", path)
                socket.emit("new-user", socket.id, connections[path])

            })

            socket.on("join-call",(path)=>{
                if(connections[path]==undefined){
                  socket.emit("room-error","room doesnt found or meeting has ended")
                  return
                }
                connections[path].push(socket.id)
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

            socket.on("mute-state", (muted) => {
                if (typeof muted !== "boolean") return
                const room = Object.values(connections).find(ids => ids.includes(socket.id))
                if (!room) return
                socket.data.muted = muted
                for (const participantId of room) {
                    if (participantId !== socket.id) {
                        io.to(participantId).emit("mute-state", socket.id, muted)
                    }
                }
            })

            socket.on("signal",(toId,message)=>{
                io.to(toId).emit("signal",socket.id,message)

            })

            socket.on("chat-message",(data,sender)=>{

                const [matchingRoom,found]=Object.entries(connections)
                .reduce(([room,found],[roomKey,roomVal])=>{
                    if(!found && roomVal.includes(socket.id)){
                        return [roomKey,true]
                    }


                    return [room,found]
                },['',false])

                if(found){
                    if(messages[matchingRoom]==undefined){
                        messages[matchingRoom]=[]
                    }

                    messages[matchingRoom].push({'sender':sender,'data':data,'socket-id-sender':socket.id})
                    connections[matchingRoom].forEach(element => {
                    io.to(element).emit("chat-message",data,sender,socket.id)
                    
                });
                }

                

                
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
