export interface FriendRequest {
    id: string;
    fromId: string;
    fromName: string;
    fromAvatar: string | null;
    toId: string;
    status: 'pending' | 'accepted' | 'declined';
    timestamp: number;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    recipientId: string;
    text: string;
    timestamp: number;
}

export interface LocalGroup {
    id: string;
    name: string;
    founderId: string;
    members: string[];
    password?: string;
    createdAt: number;
}
