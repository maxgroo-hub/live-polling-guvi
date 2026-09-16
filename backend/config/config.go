package config

import (
	"os"
	"strings"
)

type Config struct {
	Port               string
	MongoURI           string
	MongoDBName        string
	RedisAddr          string
	RedisPassword      string
	JWTSecret          string
	GinMode            string
	CORSAllowedOrigins []string
}

func LoadConfig() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	mongoDBName := os.Getenv("MONGO_DB_NAME")
	if mongoDBName == "" {
		mongoDBName = "polling_db"
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	redisPassword := os.Getenv("REDIS_PASSWORD")

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev_secret_key_change_in_production_12345"
	}

	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "debug"
	}

	corsOriginsEnv := os.Getenv("CORS_ALLOWED_ORIGINS")
	var corsOrigins []string
	if corsOriginsEnv != "" {
		corsOrigins = strings.Split(corsOriginsEnv, ",")
	} else {
		corsOrigins = []string{"http://localhost:3000", "http://localhost:8080", "*"}
	}

	return &Config{
		Port:               port,
		MongoURI:           mongoURI,
		MongoDBName:        mongoDBName,
		RedisAddr:          redisAddr,
		RedisPassword:      redisPassword,
		JWTSecret:          jwtSecret,
		GinMode:            ginMode,
		CORSAllowedOrigins: corsOrigins,
	}
}
