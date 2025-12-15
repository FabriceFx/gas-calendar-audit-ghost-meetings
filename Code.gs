/**
 * @fileoverview Audit des réunions sans participants confirmés via l'API Advanced Calendar.
 * Ce script identifie les événements futurs dont l'utilisateur est l'organisateur
 * mais qui n'ont reçu aucune acceptation positive.
 * * @author Fabrice Faucheux
 */

/**
 * Fonction principale d'audit et d'envoi de rapport.
 * Nécessite l'activation du service avancé "Google Calendar API" (identifiant: Calendar).
 */
const auditerReunionsSansParticipants = () => {
  try {
    const ID_CALENDRIER = 'primary';
    const JOURS_ANALYSE = 7;
    
    const maintenant = new Date();
    const futur = new Date();
    futur.setDate(maintenant.getDate() + JOURS_ANALYSE);

    // Configuration de la requête API Calendar v3
    // Doc: https://developers.google.com/calendar/api/v3/reference/events/list
    const argumentsApi = {
      timeMin: maintenant.toISOString(),
      timeMax: futur.toISOString(),
      singleEvents: true, // Décompose les séries récurrentes
      orderBy: 'startTime'
    };

    // Appel au service avancé (nécessite l'activation dans l'éditeur)
    console.log(`Début de l'audit pour les ${JOURS_ANALYSE} prochains jours...`);
    const reponseApi = Calendar.Events.list(ID_CALENDRIER, argumentsApi);
    const listeEvenements = reponseApi.items || [];

    // Traitement des données via reduce pour filtrage et formatage simultanés
    const réunionsCritiques = listeEvenements.reduce((acc, evenement) => {
      
      // 1. Filtre : L'utilisateur doit être l'organisateur
      // La propriété 'organizer.self' est spécifique à l'API v3
      if (!evenement.organizer || !evenement.organizer.self) return acc;

      // 2. Filtre : L'événement doit avoir des invités
      if (!evenement.attendees || evenement.attendees.length === 0) return acc;

      // 3. Analyse : Vérifier si au moins une personne a accepté ou mis "peut-être"
      const aDesParticipantsConfirmés = evenement.attendees.some(invite => {
        if (invite.self) return false; // On ne compte pas l'organisateur lui-même
        return ['accepted', 'tentative'].includes(invite.responseStatus);
      });

      // Si aucune confirmation positive détectée
      if (!aDesParticipantsConfirmés) {
        
        // Formatage des invités pour le rapport
        const détailsInvités = evenement.attendees
          .filter(inv => !inv.self)
          .map(inv => `${inv.email} (${traduireStatut(inv.responseStatus)})`);

        // Extraction de la date (gère date-heure ou journée entière)
        const dateEvenement = evenement.start.dateTime 
          ? new Date(evenement.start.dateTime) 
          : new Date(evenement.start.date);

        acc.push({
          titre: evenement.summary || "(Sans titre)",
          date: dateEvenement,
          nbInvites: détailsInvités.length,
          listeInvites: détailsInvités,
          lien: evenement.htmlLink // Lien canonique fiable
        });
      }

      return acc;
    }, []);

    // Gestion du résultat
    if (réunionsCritiques.length > 0) {
      envoyerRapportEmail(réunionsCritiques);
    } else {
      console.log('Audit terminé : Aucune réunion critique détectée.');
    }

  } catch (erreur) {
    console.error(`Erreur critique lors de l'audit : ${erreur.message}`);
    if (erreur.message.includes('Calendar is not defined')) {
      console.error("AIDE : Activez le service 'Google Calendar API' dans l'onglet 'Services' à gauche.");
    }
  }
};

/**
 * Traduit le statut technique de l'API en émoji visuel.
 * @param {string} statut - Le statut API (needsAction, declined, etc.)
 * @return {string} L'émoji correspondant.
 */
const traduireStatut = (statut) => {
  const tableDeCorrespondance = {
    'needsAction': '❓', // Pas de réponse
    'declined': '❌',    // Refusé
    'tentative': '🤔',   // Peut-être
    'accepted': '✅'     // Accepté (théoriquement non utilisé ici car filtré)
  };
  return tableDeCorrespondance[statut] || '';
};

/**
 * Génère et envoie le rapport HTML par email.
 * @param {Array<Object>} listeReunions - La liste des objets réunions filtrés.
 */
const envoyerRapportEmail = (listeReunions) => {
  try {
    const emailUtilisateur = Session.getActiveUser().getEmail();
    const sujetEmail = `⚠️ Audit Agenda : ${listeReunions.length} réunion(s) sans confirmation`;
    
    // Styles CSS inline pour compatibilité Gmail
    const styles = {
      table: 'border-collapse: collapse; width: 100%; font-family: Helvetica, Arial, sans-serif; font-size: 14px;',
      th: 'background-color: #fce8e6; color: #c5221f; border: 1px solid #e0e0e0; padding: 10px; text-align: left;',
      td: 'border: 1px solid #e0e0e0; padding: 10px; vertical-align: top;',
      lien: 'color: #1a73e8; text-decoration: none; font-weight: bold; font-size: 15px;',
      email: 'display: block; color: #5f6368; font-size: 12px; margin-top: 4px;'
    };

    // Construction du corps HTML avec Template Literals
    let corpsHtml = `
      <div style="font-family: Helvetica, Arial, sans-serif; color: #333;">
        <h3 style="color: #202124;">Audit de Calendrier Hebdomadaire</h3>
        <p>Les réunions suivantes, dont vous êtes l'organisateur, n'ont reçu aucune confirmation (✅) ni option (🤔) de la part des invités :</p>
        
        <table style="${styles.table}">
          <thead>
            <tr>
              <th style="${styles.th}" width="40%">Réunion</th>
              <th style="${styles.th}" width="20%">Date</th>
              <th style="${styles.th}" width="40%">Invités (Sans réponse / Refus)</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Injection des lignes
    corpsHtml += listeReunions.map(reunion => {
      const dateFormatee = reunion.date.toLocaleString('fr-FR', { 
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
      });

      const invitesHtml = reunion.listeInvites
        .map(info => `<span style="${styles.email}">${info}</span>`)
        .join('');

      return `
        <tr>
          <td style="${styles.td}">
            <a href="${reunion.lien}" style="${styles.lien}" target="_blank">
              ${reunion.titre} ↗
            </a>
          </td>
          <td style="${styles.td}">${dateFormatee}</td>
          <td style="${styles.td}">${invitesHtml}</td>
        </tr>
      `;
    }).join('');

    corpsHtml += `
          </tbody>
        </table>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          Généré par Fabrice Faucheux - Expert Apps Script.
        </p>
      </div>
    `;

    MailApp.sendEmail({
      to: emailUtilisateur,
      subject: sujetEmail,
      htmlBody: corpsHtml
    });

    console.log(`Rapport envoyé avec succès à : ${emailUtilisateur}`);

  } catch (erreur) {
    console.error(`Erreur lors de l'envoi du mail : ${erreur.message}`);
  }
};

/**
 * Installe un déclencheur temporel (Trigger) pour exécuter l'audit automatiquement.
 * Configure une exécution quotidienne vers 08h00.
 * @see https://developers.google.com/apps-script/reference/script/clock-trigger-builder
 */
const installerDeclencheurQuotidien = () => {
  try {
    const NOM_FONCTION_CIBLE = 'auditerReunionsSansParticipants';
    
    // 1. Audit des déclencheurs existants pour éviter les doublons
    const declencheursActuels = ScriptApp.getProjectTriggers();
    
    const existeDeja = declencheursActuels.some(trigger => 
      trigger.getHandlerFunction() === NOM_FONCTION_CIBLE
    );

    if (existeDeja) {
      console.warn(`⚠️ Installation annulée : Un déclencheur pour "${NOM_FONCTION_CIBLE}" est déjà actif.`);
      return; // On arrête tout pour ne pas créer de doublon
    }

    // 2. Création du nouveau déclencheur
    ScriptApp.newTrigger(NOM_FONCTION_CIBLE)
      .timeBased()
      .everyDays(1) // Fréquence quotidienne
      .atHour(8)    // Plage horaire : entre 8h00 et 9h00 (fuseau du script)
      .create();

    console.log(`✅ Succès : L'audit s'exécutera désormais chaque matin entre 8h et 9h.`);

  } catch (erreur) {
    console.error(`❌ Erreur d'installation du trigger : ${erreur.message}`);
  }
};

/**
 * Utilitaire pour supprimer tous les déclencheurs du projet (Nettoyage).
 * À utiliser avec précaution.
 */
const supprimerTousLesDeclencheurs = () => {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  console.log(`🧹 Nettoyage terminé : ${triggers.length} déclencheur(s) supprimé(s).`);
};
