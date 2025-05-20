#include <SPI.h>
#include <MFRC522.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

#define RST_PIN     D1
#define SS_PIN      D2
#define LED_ROUGE   D0  // GPIO16
#define LED_VERTE   D4  // GPIO2
#define BUZZER      D8  // GPIO15

const char* ssid = "Airbox-5D9E";
const char* password = "@MDCHRISTOPHER@";
const String serverName = "http://192.168.1.151:3000/api";

MFRC522 rfid(SS_PIN, RST_PIN);
String mode = "controle";

String dernierUID = "";               // Anti-double scan
unsigned long dernierScan = 0;
unsigned long dernierModeCheck = 0;
const unsigned long intervalleMode = 5000;

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();

  pinMode(LED_ROUGE, OUTPUT);
  pinMode(LED_VERTE, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  WiFi.begin(ssid, password);
  Serial.print("Connexion WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnecté !");
}

void loop() {
  unsigned long maintenant = millis();

  if (maintenant - dernierModeCheck >= intervalleMode) {
    lireMode();
    digitalWrite(LED_ROUGE, (mode == "enregistrement") ? HIGH : LOW);
    dernierModeCheck = maintenant;
  }

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uid += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(rfid.uid.uidByte[i], HEX);
    uid += " ";
  }
  uid.trim();

  // 🔁 Anti-doublon : ne pas traiter plusieurs fois la même carte dans les 5s
  if (uid == dernierUID && millis() - dernierScan < 5000) return;
  dernierUID = uid;
  dernierScan = millis();

  Serial.print("Carte détectée UID: ");
  Serial.println(uid);

  if (mode == "enregistrement") {
    envoyerDernierUID(uid);  // ✅ On notifie le backend
    Serial.println(">> Mode ENREGISTREMENT actif.");
    tone(BUZZER, 1500, 200);
    delay(3000);
  } else {
    verifierAcces(uid);
  }

  delay(1000);
}

void lireMode() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    http.begin(client, serverName + "/mode");
    int code = http.GET();
    if (code == 200) {
      String payload = http.getString();
      mode = (payload.indexOf("enregistrement") != -1) ? "enregistrement" : "controle";
      Serial.println("Mode actuel : " + mode);
    }
    http.end();
  }
}

void verifierAcces(String uid) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    http.begin(client, serverName + "/verify");
    http.addHeader("Content-Type", "application/json");
    String jsonData = "{\"uid\":\"" + uid + "\"}";
    int code = http.POST(jsonData);

    if (code == 200) {
      Serial.println("✅ Carte reconnue !");
      clignoterLEDVerte(2);
    } else {
      Serial.println("❌ Carte inconnue !");
      digitalWrite(LED_VERTE, HIGH);
      tone(BUZZER, 800);
      delay(3000);
      digitalWrite(LED_VERTE, LOW);
      noTone(BUZZER);
    }
    http.end();
  }
}

void clignoterLEDVerte(int nbBips) {
  for (int i = 0; i < nbBips; i++) {
    digitalWrite(LED_VERTE, HIGH);
    tone(BUZZER, 1000, 200);
    delay(400);
    digitalWrite(LED_VERTE, LOW);
    delay(200);
  }
}

void envoyerDernierUID(String uid) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    http.begin(client, serverName + "/last");
    http.addHeader("Content-Type", "application/json");

    String json = "{\"uid\":\"" + uid + "\"}";
    http.POST(json);
    http.end();
  }
}
