import { Server } from "http";

@WebSocketGateway()
export class TokenGateway {
  @WebSocketServer()
     server!: Server;

  sendUpdate(data: any) {
    this.server.emit('tokenDataUpdate', data);
  }
}
function WebSocketGateway(): (target: typeof TokenGateway) => void | typeof TokenGateway {
     throw new Error("Function not implemented.");
}

function WebSocketServer(): (target: TokenGateway, propertyKey: "server") => void {
     throw new Error("Function not implemented.");
}

