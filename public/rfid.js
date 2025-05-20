
    let blockUIDUpdate = false;

    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const main = document.getElementById('main');
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('collapsed');
    }

    function showSection(id) {
      document.querySelectorAll(".section").forEach(sec => sec.style.display = "none");
      document.getElementById(id).style.display = "block";
    }

    async function toggleMode() {
      await fetch('/api/mode', { method: 'POST' });
      updateMode();
      document.getElementById("uid_new").textContent = "...";
      document.getElementById("uid_check").textContent = "...";
      document.getElementById("nom_check").textContent = "-";
      document.getElementById("prenom_check").textContent = "-";
      document.getElementById("acces_resultat").innerHTML = "";
    }

    async function updateMode() {
      const res = await fetch('/api/mode');
      const data = await res.json();
      document.getElementById("modeAffichage").textContent = data.mode;
    }

    async function updateListe() {
      const res = await fetch('/api/logs');
      const users = await res.json();
      const tbody = document.getElementById("liste_table");
      tbody.innerHTML = "";
      users.forEach(u => {
        tbody.innerHTML += `<tr>
        <td>${u.nom}</td><td>${u.prenom}</td><td>${u.uid}</td><td>${u.date_enregistrement}</td>
        <td>
          <button class='btn btn-sm btn-primary me-1' onclick='modifier("${u.uid}", "${u.nom}", "${u.prenom}")'>Modifier</button>
          <button class='btn btn-sm btn-danger' onclick='supprimer("${u.uid}")'>Supprimer</button>
        </td>
      </tr>`;
      });
    }

    function modifier(uid, nom, prenom) {
      document.getElementById("uid_new").textContent = uid;
      document.getElementById("nom").value = nom;
      document.getElementById("prenom").value = prenom;
      showSection("register");
    }

    async function supprimer(uid) {
      if (confirm("❗ Supprimer définitivement cet étudiant ?")) {
        await fetch('/api/delete/' + encodeURIComponent(uid), { method: 'DELETE' });
        alert("Étudiant supprimé !");
        updateListe();
        if (document.getElementById("uid_new").textContent === uid) {
          document.getElementById("uid_new").textContent = "...";
        }
      }
    }

    async function enregistrer(e) {
      e.preventDefault();
      const nom = document.getElementById("nom").value;
      const prenom = document.getElementById("prenom").value;
      const uid = document.getElementById("uid_new").textContent;

      if (uid === "..." || !uid) {
        alert("❗ Aucun UID détecté.");
        return;
      }

      blockUIDUpdate = true;

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, nom, prenom })
      });

      if (res.status === 201) {
        alert("✅ Étudiant enregistré !");
        document.getElementById("nom").value = "";
        document.getElementById("prenom").value = "";
        document.getElementById("uid_new").textContent = "...";
        updateListe();
      } else if (res.status === 409) {
        alert("⚠️ Cet UID est déjà enregistré !");
      } else {
        alert("❌ Erreur lors de l'enregistrement.");
      }

      setTimeout(() => {
        blockUIDUpdate = false;
      }, 3000);
    }




    async function checkDernierBadge() {
      const [modeRes, badgeRes] = await Promise.all([
        fetch('/api/mode'),
        fetch('/api/last')
      ]);

      const modeData = await modeRes.json();
      const data = await badgeRes.json();

      if (data && data.uid) {
        if (modeData.mode === "enregistrement" && !blockUIDUpdate) {
          document.getElementById("uid_new").textContent = data.uid;
        }
        else {
          document.getElementById("uid_check").textContent = data.uid;
          if (data.nom) {
            document.getElementById("nom_check").textContent = data.nom;
            document.getElementById("prenom_check").textContent = data.prenom;
            document.getElementById("acces_resultat").innerHTML = '<span class="text-success">✅ Accès autorisé</span>';
          } else {
            document.getElementById("nom_check").textContent = "-";
            document.getElementById("prenom_check").textContent = "-";
            document.getElementById("acces_resultat").innerHTML = '<span class="text-danger">❌ Carte inconnue</span>';
          }
        }
      } else {
        // Aucune carte détectée récemment : on efface les champs
        if (modeData.mode === "enregistrement") {
          document.getElementById("uid_new").textContent = "...";
        } else {
          document.getElementById("uid_check").textContent = "...";
          document.getElementById("nom_check").textContent = "-";
          document.getElementById("prenom_check").textContent = "-";
          document.getElementById("acces_resultat").innerHTML = "";
        }
      }
    }

    setInterval(() => {
      updateListe();
      checkDernierBadge();
      updateMode();
    }, 3000);

    window.onload = () => {
      showSection('welcome');
      updateMode();
      updateListe();
      checkDernierBadge();
    };
