import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { AlertTriangle, Check, Save, Trash2, UploadCloud } from 'lucide-react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VehicleDefinition } from '../../ui/menu/catalog';
import { createDraftVehicleDefinition } from '../vehicleImport';

type ImportPhase = 'idle' | 'validating' | 'ready' | 'saving' | 'success' | 'error';

interface VehicleImportPanelProps {
    active: boolean;
    vehicle: VehicleDefinition;
    onPreview: (vehicle: VehicleDefinition, file: File) => void;
    onSave: (vehicle: VehicleDefinition, file: File) => Promise<void>;
    onDelete: (vehicle: VehicleDefinition) => Promise<void>;
}

const ACCEPTED_EXTENSIONS = ['.glb', '.gltf'];
const MAX_FILE_SIZE = 60 * 1024 * 1024;

export function VehicleImportPanel({ active, vehicle, onPreview, onSave, onDelete }: VehicleImportPanelProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [phase, setPhase] = useState<ImportPhase>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const isDraft = vehicle.source === 'imported' && vehicle.saved === false && file !== null;
    const canDelete = vehicle.source === 'imported' && vehicle.saved === true;

    const handleFiles = async (files: FileList | null): Promise<void> => {
        const nextFile = files?.[0] ?? null;
        if (!nextFile) return;
        setError('');
        setPhase('validating');
        try {
            validateFile(nextFile);
            const objectUrl = URL.createObjectURL(nextFile);
            try {
                await new GLTFLoader().loadAsync(objectUrl);
            } catch {
                URL.revokeObjectURL(objectUrl);
                throw new Error('Le modèle 3D ne peut pas être lu. Pour un import fiable, utilise un .glb ou un .gltf avec ressources embarquées.');
            }
            setFile(nextFile);
            setPhase('ready');
            onPreview(createDraftVehicleDefinition(nextFile, objectUrl), nextFile);
        } catch (err) {
            setPhase('error');
            setError(err instanceof Error ? err.message : 'Import impossible : fichier non reconnu.');
        } finally {
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
        void handleFiles(event.target.files);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        setDragActive(false);
        void handleFiles(event.dataTransfer.files);
    };

    const handleSave = async (): Promise<void> => {
        if (!file || !isDraft) return;
        setPhase('saving');
        setError('');
        try {
            await onSave(vehicle, file);
            setPhase('success');
            setFile(null);
        } catch (err) {
            setPhase('error');
            setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
        }
    };

    const handleDelete = async (): Promise<void> => {
        if (!canDelete) return;
        setPhase('saving');
        setError('');
        try {
            await onDelete(vehicle);
            setPhase('success');
        } catch (err) {
            setPhase('error');
            setError(err instanceof Error ? err.message : 'Suppression impossible.');
        }
    };

    return (
        <div className="vehicle-import" aria-live="polite">
            <input
                ref={inputRef}
                className="vehicle-import__input"
                type="file"
                accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                tabIndex={-1}
                onChange={handleInputChange}
            />
            <div
                className={`vehicle-import__dropzone${dragActive ? ' is-dragging' : ''}`}
                role="button"
                tabIndex={active ? 0 : -1}
                aria-label="Importer un modèle 3D de véhicule"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
                }}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
            >
                <UploadCloud size={24} strokeWidth={1.9} aria-hidden="true" />
                <strong>Drop GLB / GLTF</strong>
                <span>ou cliquer pour choisir un fichier</span>
            </div>
            <Checklist phase={phase} hasDraft={isDraft} saved={vehicle.saved === true} />
            {error && (
                <p className="vehicle-import__message vehicle-import__message--error">
                    <AlertTriangle size={15} aria-hidden="true" /> {error}
                </p>
            )}
            {phase === 'success' && <p className="vehicle-import__message vehicle-import__message--success"><Check size={15} aria-hidden="true" /> Bibliothèque véhicule mise à jour.</p>}
            <div className="vehicle-import__actions">
                <button className="vehicle-settings-action vehicle-settings-action--save" type="button" disabled={!isDraft || phase === 'saving'} tabIndex={active ? 0 : -1} aria-busy={phase === 'saving'} onClick={handleSave}>
                    <Save size={15} aria-hidden="true" /> {phase === 'saving' && isDraft ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button className="vehicle-settings-action vehicle-settings-action--danger" type="button" disabled={!canDelete || phase === 'saving'} tabIndex={active ? 0 : -1} onClick={handleDelete}>
                    <Trash2 size={15} aria-hidden="true" /> Supprimer
                </button>
            </div>
        </div>
    );
}

function Checklist({ phase, hasDraft, saved }: { phase: ImportPhase; hasDraft: boolean; saved: boolean; }): JSX.Element {
    const validating = phase === 'validating';
    const items = [
        { label: 'Format GLB / GLTF', done: validating || hasDraft || saved, busy: validating },
        { label: 'Lecture scène 3D', done: hasDraft || saved, busy: validating },
        { label: 'Prévisualisation active', done: hasDraft || saved, busy: false },
        { label: 'Sauvegarde IndexedDB', done: saved, busy: phase === 'saving' }
    ];
    return (
        <ol className="vehicle-import__checklist">
            {items.map((item) => (
                <li key={item.label} className={item.done ? 'is-done' : item.busy ? 'is-busy' : ''}>
                    <span aria-hidden="true">{item.done ? '✓' : item.busy ? '…' : '·'}</span>
                    {item.label}
                </li>
            ))}
        </ol>
    );
}

function validateFile(file: File): void {
    const lowerName = file.name.toLowerCase();
    const hasSupportedExtension = ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
    if (!hasSupportedExtension) throw new Error('Format refusé : importe un fichier .glb ou .gltf.');
    if (file.size <= 0) throw new Error('Fichier vide : exporte à nouveau le modèle depuis ton outil 3D.');
    if (file.size > MAX_FILE_SIZE) throw new Error('Fichier trop lourd : limite actuelle 60 Mo pour préserver les performances du showroom.');
}
