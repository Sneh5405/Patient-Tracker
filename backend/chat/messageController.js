import prisma from '../client.js';
import jwt from 'jsonwebtoken';

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Create a new message in a chat
export const createMessage = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { chatId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Verify the chat exists
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { patient: true, doctor: true }
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Verify user is part of the chat
    const isPatient = decoded.role === 'patient' && chat.patientId === parseInt(decoded.id);
    const isDoctor = decoded.role === 'doctor' && chat.doctorId === decoded.id;
    
    if (!isPatient && !isDoctor) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Convert senderId to string to ensure proper type handling
    const senderId = String(decoded.id);
    
    // Create the message
    const newMessage = await prisma.message.create({
      data: {
        content,
        chatId,
        senderId,
        senderType: decoded.role
      }
    });
    
    // Update the chat's updatedAt timestamp
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });
    
    return res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({ error: 'Failed to create message' });
  }
};

// Get all messages for a chat
export const getMessagesByChatId = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { chatId } = req.params;
    
    // Verify the chat exists
    const chat = await prisma.chat.findUnique({
      where: { id: chatId }
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Verify user is part of the chat
    const isPatient = decoded.role === 'patient' && chat.patientId === parseInt(decoded.id);
    const isDoctor = decoded.role === 'doctor' && chat.doctorId === decoded.id;
    
    if (!isPatient && !isDoctor) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Get messages
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });
    
    // If the user is retrieving messages, mark unread messages as read
    if (decoded.role === 'doctor') {
      await prisma.message.updateMany({
        where: {
          chatId,
          senderType: 'patient',
          readStatus: false
        },
        data: { readStatus: true }
      });
    } else if (decoded.role === 'patient') {
      await prisma.message.updateMany({
        where: {
          chatId,
          senderType: 'doctor',
          readStatus: false
        },
        data: { readStatus: true }
      });
    }
    
    return res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
}; 