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
            ioInstance.to(`user:${userId}`).emit(event, data);
            return true;
        }
        return false;
    }
};
