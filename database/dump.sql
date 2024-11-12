-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: estebanquito
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `historial_intereses`
--

DROP TABLE IF EXISTS `historial_intereses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_intereses` (
  `interes_id` int NOT NULL AUTO_INCREMENT,
  `numero_cuenta` int NOT NULL,
  `monto_interes` decimal(10,2) NOT NULL,
  `fecha` date NOT NULL,
  PRIMARY KEY (`interes_id`),
  KEY `numero_cuenta` (`numero_cuenta`),
  CONSTRAINT `historial_intereses_ibfk_1` FOREIGN KEY (`numero_cuenta`) REFERENCES `reportes` (`numero_cuenta`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_intereses`
--

LOCK TABLES `historial_intereses` WRITE;
/*!40000 ALTER TABLE `historial_intereses` DISABLE KEYS */;
/*!40000 ALTER TABLE `historial_intereses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prestamos`
--

DROP TABLE IF EXISTS `prestamos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prestamos` (
  `prestamo_id` int NOT NULL AUTO_INCREMENT,
  `numero_cuenta` int NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `plazo` int NOT NULL,
  `estado` varchar(50) NOT NULL,
  `fecha_solicitud` datetime NOT NULL,
  PRIMARY KEY (`prestamo_id`),
  KEY `numero_cuenta` (`numero_cuenta`),
  CONSTRAINT `prestamos_ibfk_1` FOREIGN KEY (`numero_cuenta`) REFERENCES `usuarios` (`numero_cuenta`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prestamos`
--

LOCK TABLES `prestamos` WRITE;
/*!40000 ALTER TABLE `prestamos` DISABLE KEYS */;
INSERT INTO `prestamos` VALUES (1,321894,50.00,2,'Aprobado','2024-11-11 18:36:51'),(2,321895,50.00,1,'Aprobado','2024-11-11 18:37:10'),(3,321895,5.00,1,'Aprobado','2024-11-11 18:40:39'),(4,321895,10.00,2,'Aprobado','2024-11-11 18:40:57'),(5,321894,5.00,2,'Aprobado','2024-11-11 18:57:41'),(6,321894,10.00,2,'Aprobado','2024-11-11 18:59:40');
/*!40000 ALTER TABLE `prestamos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reportes`
--

DROP TABLE IF EXISTS `reportes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reportes` (
  `reporte_id` int NOT NULL AUTO_INCREMENT,
  `numero_cuenta` int NOT NULL,
  `historico_egresos` decimal(10,2) DEFAULT '0.00',
  `historico_ingresos` decimal(10,2) DEFAULT '0.00',
  `deudas` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`reporte_id`),
  KEY `numero_cuenta` (`numero_cuenta`),
  CONSTRAINT `reportes_ibfk_1` FOREIGN KEY (`numero_cuenta`) REFERENCES `usuarios` (`numero_cuenta`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reportes`
--

LOCK TABLES `reportes` WRITE;
/*!40000 ALTER TABLE `reportes` DISABLE KEYS */;
INSERT INTO `reportes` VALUES (1,321894,0.00,165.00,10.00);
/*!40000 ALTER TABLE `reportes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transacciones`
--

DROP TABLE IF EXISTS `transacciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transacciones` (
  `transaccion_id` int NOT NULL AUTO_INCREMENT,
  `cuenta_principal_id` int NOT NULL,
  `cuenta_destino_id` int DEFAULT NULL,
  `tipo` varchar(50) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `fecha` datetime NOT NULL,
  PRIMARY KEY (`transaccion_id`),
  KEY `cuenta_principal_id` (`cuenta_principal_id`),
  KEY `cuenta_destino_id` (`cuenta_destino_id`),
  CONSTRAINT `transacciones_ibfk_1` FOREIGN KEY (`cuenta_principal_id`) REFERENCES `usuarios` (`numero_cuenta`),
  CONSTRAINT `transacciones_ibfk_2` FOREIGN KEY (`cuenta_destino_id`) REFERENCES `usuarios` (`numero_cuenta`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transacciones`
--

LOCK TABLES `transacciones` WRITE;
/*!40000 ALTER TABLE `transacciones` DISABLE KEYS */;
INSERT INTO `transacciones` VALUES (1,321895,NULL,'Deposito',5000.00,'2024-11-11 18:14:35'),(2,321895,321894,'Transferencia',50.00,'2024-11-11 18:16:07'),(3,321895,NULL,'Retiro',50.00,'2024-11-11 18:16:23'),(4,321894,NULL,'Deposito',50.00,'2024-11-11 18:59:08');
/*!40000 ALTER TABLE `transacciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `numero_cuenta` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `contraseña` varchar(255) NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `saldo` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`numero_cuenta`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (301793,'Felipe ','felipe@gmail.com','$2b$10$2Q.j3.s4PYpRqEJ3TGZqvuJbo.ZURjTZ14k.iWkvXFf1aeaMbgBs.','Corriente',0.00),(305450,'Victor Manuel','victormanuel@gmail.com','$2b$10$rUt56RnN6uexF3WGoK.9C.n/ek40qy4nFBpkGfrZEsgTYX/V8HVHC','Ahorros',0.00),(321894,'Jhon Hander','jhonhanderr@gmail.com','$2b$10$SnoE2DqzNh7bW9ZrLDDRzuhOE/p19BJMcl.v1zM2wbd8q7Xm5g1xW','Ahorros',165.00),(321895,'Juan','juann@gmail.com','$2b$10$RAsxsRlGIPiKTqQ6aRQndO4.LGwaQYsgcewiGM0GnGM0O5UGMTVm2','Ahorros',4965.00);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-11-11 19:00:48
