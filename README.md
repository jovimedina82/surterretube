# 🚀 SurterreTube

**A professional streaming platform with futuristic admin controls and real-time event management.**

## 🌟 Features

### 🎥 **Live Streaming**
- HLS (HTTP Live Streaming) support
- Real-time viewer statistics
- Stream quality adaptation
- Mobile-optimized player

### 📅 **Event Management**
- Real-time event scheduling
- Automatic event updates (5-second refresh)
- Futuristic event modal with upcoming events
- Smart date formatting (Today, Tomorrow, etc.)

### 🛡️ **Authentication & Security**
- Microsoft Entra ID (SSO) integration
- JWT-based admin authentication
- Session management with secure cookies
- Role-based access control

### ⚡ **Futuristic Admin Panel**
- Mission Control dashboard design
- Real-time system metrics
- Glass morphism UI with animations
- Professional dark theme
- Responsive design

### 💬 **Real-time Features**
- Live chat integration
- Reaction system (👍❤️👎)
- Real-time viewer presence
- Auto-refresh capabilities

## 🏗️ **Architecture**

```
SurterreTube/
├── frontend/          # Next.js 14 React application
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/ # Reusable React components
│   │   └── lib/       # Utilities and libraries
│   └── public/        # Static assets
├── chat/              # Node.js chat service
├── srs/               # Simple Realtime Server (streaming)
├── configs/           # Configuration files
└── systemd/           # System service definitions
```

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+ 
- PostgreSQL
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/surterretube.git
   cd surterretube
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install
   
   # Chat service
   cd ../chat
   npm install
   ```

4. **Set up database**
   ```bash
   # Create PostgreSQL database and run migrations
   # (Database setup instructions here)
   ```

5. **Start development**
   ```bash
   # Frontend
   cd frontend
   npm run dev
   
   # Chat service
   cd ../chat
   npm start
   ```

## 🔧 **Configuration**

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=surterretube_prod

# Authentication
ADMIN_JWT_SECRET=your-super-secret-jwt-key
MSAL_CLIENT_ID=your-azure-app-client-id
MSAL_CLIENT_SECRET=your-azure-app-secret

# Streaming
STREAM_BASE_URL=your-streaming-server-url
```

### Database Schema

The project uses PostgreSQL with the following main tables:
- `admin_users` - Administrator accounts
- `events` - Scheduled streaming events
- `videos` - Video content library

## 📋 **API Endpoints**

### Public Endpoints
- `GET /api/stream` - Current stream information
- `GET /api/events/upcoming` - Next upcoming event
- `GET /api/events/all` - All upcoming events

### Admin Endpoints
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/session` - Check admin session
- `GET /api/admin/users` - List admin users
- `POST /api/admin/events` - Create new event

## 🎨 **UI Components**

### Futuristic Admin Components
- `FuturisticButton` - Gradient buttons with animations
- `FuturisticInput` - Glowing form inputs
- `FuturisticCard` - Glass-like containers
- `StatusBadge` - Animated status indicators
- `EventsModal` - Interactive events display

## 🔐 **Security Features**

- **Environment Protection**: All secrets in environment variables
- **JWT Authentication**: Secure admin sessions
- **CORS Protection**: Configured for production domains
- **Input Validation**: Server-side validation on all inputs
- **SQL Injection Prevention**: Parameterized queries

## 🌐 **Deployment**

### Production Deployment

1. **Build the application**
   ```bash
   cd frontend
   npm run build
   ```

2. **Set up systemd services**
   ```bash
   sudo cp systemd/*.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable surterretube-frontend
   sudo systemctl start surterretube-frontend
   ```

3. **Configure reverse proxy** (nginx recommended)

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use the existing component patterns
- Maintain the futuristic design aesthetic
- Add proper error handling
- Include proper documentation

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/surterretube/issues) page
2. Create a new issue with detailed description
3. Contact the development team

## 🏢 **About Surterre Properties**

This streaming platform is developed for [Surterre Properties](https://www.surterreproperties.com), providing professional real estate presentations and virtual meetings.

---

**Built with ❤️ using Next.js, React, TypeScript, and PostgreSQL**