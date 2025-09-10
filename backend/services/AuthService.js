const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const config = require('../config'); // Adjust path as needed
const { logger } = require('../utils'); // Adjust path as needed

class AuthService {
  constructor() {
    this.prisma = new PrismaClient();
    this.jwtSecret = config.app.jwtSecret;
    this.tokenExpiresIn = config.app.tokenExpiresIn;
    if (!this.jwtSecret || this.jwtSecret === 'your_super_secret_jwt_key_here') {
      logger.warn('JWT_SECRET is not set or is default. Please configure a strong secret in config.js or .env.');
    }
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  generateToken(userId, email) {
    return jwt.sign({ userId, email }, this.jwtSecret, { expiresIn: this.tokenExpiresIn });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      logger.error('JWT verification failed:', error.message);
      return null;
    }
  }

  async registerUser(email, password, name = null) {
    try {
      const existingUser = await this.prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error('User with this email already exists.');
      }

      const hashedPassword = await this.hashPassword(password);
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });
      logger.success(`User registered: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async loginUser(email, password) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new Error('Invalid credentials.');
      }

      const isMatch = await this.comparePassword(password, user.password);
      if (!isMatch) {
        throw new Error('Invalid credentials.');
      }

      const token = this.generateToken(user.id, user.email);
      logger.info(`User logged in: ${user.email}`);
      return { user: { id: user.id, email: user.email, name: user.name }, token };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

module.exports = { AuthService };