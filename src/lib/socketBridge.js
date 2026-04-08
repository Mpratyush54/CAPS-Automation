let ioInstance = null;

module.exports = {
    setIO: (io) => {
        ioInstance = io;
    },
    getIO: () => {
        return ioInstance;
    },
    emitToUser: (userId, event, data) => {
        if (ioInstance) {
            const userIdStr = String(userId).toLowerCase();
            const room = `user:${userIdStr}`;
            
            // Diagnostics
            const roomSize = ioInstance.sockets.adapter.rooms.get(room)?.size || 0;
            
            ioInstance.to(room).emit(event, data);
            
            if (roomSize === 0) {
                console.warn(`⚠️ [SOCKET] Room ${room} is empty. ID Length: ${userIdStr.length}, Type: ${typeof userId}`);
            } else {
                console.log(`📡 [SOCKET] Delivered to ${room} (${roomSize} socket(s) active).`);
            }
            
            return { sent: true, roomSize };
        }
        return { sent: false, roomSize: 0 };
    }
};
