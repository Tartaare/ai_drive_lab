Nouvelle branche pour cette mission (respecte les règles).


Dans le garage:

Dans le garage > menu Detection map :


- On va implémenter la sélection du noeud directement sur la scène 3D. 
Par exemple: il s'agira pour l'utilisateur de cliquer sur la roue avant gauche du véhicule dans la scène 3D pour la sélectionner.

Une fois en mode crosshair de selection: il




Assure toi de respecter les règles d'UI/UX.

===================== DONE =====================
# commit / merge / push / ect. on veut un repo propre et à jour.



Pour une meilleure UX on va modifier l'UI du menu.
1. On va modifier les cases d'element du mapping (FL Wheel, etc.) avec (dans l'ordre de gauche à droite):
    - (2/5 de l'espace): le titre de l'élément recherché + le nom des elements selectionnés dans le modèle (2 lignes).
    - (1/5 de l'espace): un bouton icone scan-search qui lance la recherche/détection automatique de l'élément.
    - (1/5 de l'espace): un bouton icone folder-tree qui ouvre la liste des noeuds disponibles dans le modèle.
    - (1/5 de l'espace) un bouton icone mouse-pointer-click qui permet de sélectionner un noeud directement sur le vehicule dans la scène 3D (on implémentera ça après).

On va modifier l'UI de cette page et la diviser en 2 parties:
- La partie gauche (2/5 de l'espace) pour le panneau des menus, menus qui seront désormai dans des onglets.
- La partie droite (3/5 de l'espace) pour le vehocule de la scène 3D.


Dans notre app on détecte automatiquement sur les modeles 3D les parties du véhicule dont on a besoin (roues, etc.). VehicleSetup.prepareModel
Cependant avec certains modèles notre détection ne fonctionne pas correctement.
Analyse le modèle suivant pour lequel on a du mal à détecter les éléments correctement:
; puis améliore notre système de détection pour qu'il soit plus flexible et robuste.