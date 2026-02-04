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

// Create a new chat between doctor and patient
export const createChat = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { patientId, doctorId } = req.body;
    
    // Validate that both IDs are provided
    if (!patientId || !doctorId) {
      return res.status(400).json({ error: 'Patient ID and Doctor ID are required' });
    }
    
    // Check if chat already exists between this doctor and patient
    const existingChat = await prisma.chat.findFirst({
      where: {
        patientId: parseInt(patientId),
        doctorId
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            specialization: true
          }
        }
      }
    });
    
    if (existingChat) {
      console.log(`Found existing chat (ID: ${existingChat.id}) between doctor ${doctorId} and patient ${patientId}`);
      return res.status(200).json({
        ...existingChat,
        isExisting: true
      });
    }
    
    // Create new chat since none exists
    console.log(`Creating new chat between doctor ${doctorId} and patient ${patientId}`);
    const newChat = await prisma.chat.create({
      data: {
        patientId: parseInt(patientId),
        doctorId
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            specialization: true
          }
        }
      }
    });
    
    return res.status(201).json({
      ...newChat,
      isNew: true
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ error: 'Failed to create chat' });
  }
};

// Get all chats for a doctor
export const getChatsByDoctor = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'doctor') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const doctorId = decoded.id;
    
    const chats = await prisma.chat.findMany({
      where: {
        doctorId
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    return res.status(200).json(chats);
  } catch (error) {
    console.error('Error fetching doctor chats:', error);
    return res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

// Get all chats for a patient
export const getChatsByPatient = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'patient') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const patientId = parseInt(decoded.id);
    
    const chats = await prisma.chat.findMany({
      where: {
        patientId
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            specialization: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    return res.status(200).json(chats);
  } catch (error) {
    console.error('Error fetching patient chats:', error);
    return res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

// Get a specific chat by ID
export const getChatById = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { chatId } = req.params;
    
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            specialization: true
          }
        }
      }
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Verify that the requesting user is part of this chat
    const isAuthorized = (decoded.role === 'doctor' && chat.doctorId === decoded.id) || 
                         (decoded.role === 'patient' && chat.patientId === parseInt(decoded.id));
    
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    return res.status(200).json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    return res.status(500).json({ error: 'Failed to fetch chat' });
  }
}; 