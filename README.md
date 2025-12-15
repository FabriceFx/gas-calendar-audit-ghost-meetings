# Audit de Calendrier : Détection de Réunions "Fantômes"

![License MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script-green)
![Runtime](https://img.shields.io/badge/Google%20Apps%20Script-V8-green)
![Author](https://img.shields.io/badge/Auteur-Fabrice%20Faucheux-orange)

**gas-calendar-audit-ghost-meetings** est un script de maintenance pour Google Workspace. Il analyse périodiquement votre agenda pour identifier les créneaux que vous avez organisés mais pour lesquels **aucun invité n'a confirmé sa présence**.

Il résout le problème des "réunions zombies" qui polluent l'agenda alors que personne ne compte y assister.

## 🚀 Fonctionnalités Clés

* **Précision API v3** : Utilise le Service Avancé Calendar pour accéder aux métadonnées précises (`organizer.self`, `responseStatus`) et générer des liens `htmlLink` fiables.
* **Logique de Filtrage** :
    * Cible uniquement les événements futurs (J+7).
    * Exclut les événements sans invités.
    * Alerte uniquement si le taux d'acceptation (Accepté ou Peut-être) est de 0%.
* **Reporting Email** : Envoie un rapport HTML clair contenant les liens directs vers les événements pour une suppression rapide.
* **Automatisation** : Script de déploiement inclus pour une exécution quotidienne (Cron job).

## 📋 Prérequis

* Un compte Google Workspace ou Gmail.
* Accès à [Google Apps Script](https://script.google.com/).

## ⚙️ Installation

### 1. Création du Script
1.  Créez un nouveau projet sur script.google.com.
2.  Copiez le contenu du fichier `Code.js` dans l'éditeur.

### 2. Activation du Service Avancé (Critique)
Ce script utilise l'API REST Calendar, qui n'est pas activée par défaut.
1.  Dans l'éditeur Apps Script, cliquez sur le **+** à côté de **Services** (colonne de gauche).
2.  Recherchez **Google Calendar API**.
3.  Sélectionnez-la et assurez-vous que l'identifiant est `Calendar`.
4.  Cliquez sur **Ajouter**.

### 3. Automatisation
1.  Sélectionnez la fonction `installerDeclencheurQuotidien` dans la barre d'outils.
2.  Cliquez sur **Exécuter**.
3.  Acceptez les demandes d'autorisation.
    * *Note : Le script vérifiera l'existence de déclencheurs pour éviter les doublons.*

## 🛠️ Structure du Projet

```text
/
├── Code.js      # Logique principale (Audit + Trigger + Email)
└── README.md    # Documentation
