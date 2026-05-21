import * as THREE from 'three';

export class VehicleSetup
{
	public static prepareModel(model: THREE.Object3D): void
	{
		const box = new THREE.Box3().setFromObject(model);
		const size = new THREE.Vector3();
		box.getSize(size);
		const center = new THREE.Vector3();
		box.getCenter(center);

		// 1. Create Collision Box
		// We create a simple box geometry that covers the car body roughly
		// We assume the car is roughly centered and the wheels are at the bottom
		
		// IMPORTANT: We use a 2x2x2 box geometry because SimpleCar.ts uses scale as half-extents for Cannon
		// If geometry is 2x2x2, and we scale it by X, the size is 2*X. 
		// Cannon Box(X) creates a box of size 2*X.
		// So visual and physical sizes match if we use BoxGeometry(2,2,2) and set scale to half-size.
		const collisionGeo = new THREE.BoxGeometry(2, 2, 2);
		const collisionMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: true, color: 0xff0000 });
		const collisionMesh = new THREE.Mesh(collisionGeo, collisionMat);
		
		// Target size
		const targetSize = new THREE.Vector3(size.x * 0.8, size.y * 0.5, size.z * 0.9);
		
		// Set scale to half-extents (because base geo is 2 wide)
		collisionMesh.scale.set(targetSize.x / 2, targetSize.y / 2, targetSize.z / 2);
		
		// Position collision box slightly above the bottom (to clear ground) and centered
		// Center Y of the box should be at: min.y + (targetSize.y / 2) + offset
		// But we want it relative to model origin.
		// Let's assume model origin is at the bottom center of the car roughly.
		collisionMesh.position.set(0, targetSize.y / 2 + 0.2, 0); 
		
		collisionMesh.userData = {
			data: 'collision',
			shape: 'box'
		};
		
		model.add(collisionMesh);

		// 2. Identify Wheels and setup properties
		const wheelsFound: string[] = [];

		model.traverse((child: any) => {
			if (child.isMesh || child.isGroup || child.type === 'Object3D')
			{
				const name = child.name.toLowerCase();
				
				// Check if it looks like a wheel
				if (name.includes('wheel'))
				{
					// Determine properties based on name
					let isWheel = false;
					let steering = false;
					let drive = 'awd'; // Default to all wheel drive

					if (name.includes('fl') || (name.includes('front') && name.includes('left')))
					{
						isWheel = true;
						steering = true;
						drive = 'fwd';
						console.log(`Auto-detected Front Left Wheel: ${child.name}`);
					}
					else if (name.includes('fr') || (name.includes('front') && name.includes('right')))
					{
						isWheel = true;
						steering = true;
						drive = 'fwd';
						console.log(`Auto-detected Front Right Wheel: ${child.name}`);
					}
					else if (name.includes('rl') || (name.includes('rear') && name.includes('left')) || (name.includes('back') && name.includes('left')))
					{
						isWheel = true;
						steering = false;
						drive = 'rwd';
						console.log(`Auto-detected Rear Left Wheel: ${child.name}`);
					}
					else if (name.includes('rr') || (name.includes('rear') && name.includes('right')) || (name.includes('back') && name.includes('right')))
					{
						isWheel = true;
						steering = false;
						drive = 'rwd';
						console.log(`Auto-detected Rear Right Wheel: ${child.name}`);
					}

					if (isWheel)
					{
						// Measure wheel radius
						const wheelBox = new THREE.Box3().setFromObject(child);
						const wheelSize = new THREE.Vector3();
						wheelBox.getSize(wheelSize);
						// Assuming wheel is roughly upright, height is diameter
						const radius = wheelSize.y / 2;

						child.userData = {
							data: 'wheel',
							drive: drive,
							steering: steering ? 'true' : 'false',
							radius: radius
						};
						wheelsFound.push(`${child.name} (r=${radius.toFixed(2)}m)`);
					}
				}
				
				// Steering wheel detection
				if (name.includes('steering') && name.includes('wheel') && !name.includes('fl') && !name.includes('fr'))
				{
					child.userData = {
						data: 'steering_wheel'
					};
					console.log(`Auto-detected Steering Wheel: ${child.name}`);
				}
			}
		});

		if (wheelsFound.length === 0) {
			console.warn("No wheels automatically detected. Ensure meshes are named like 'Wheel_FL', 'Wheel_RR', etc.");
		} else {
			console.log(`Setup complete. ${wheelsFound.length} wheels configured.`);
		}
	}
}

