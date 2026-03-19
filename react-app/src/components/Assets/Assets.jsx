import { useState, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { generateId } from '../../utils/helpers';
import { saveFile, deleteFile, formatFileSize, createThumbnail } from '../../utils/fileStorage';
import './Assets.css';

// ── Constants ──────────────────────────────────────────────────────────────────

const ASSET_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'model', label: '3D Model' },
  { value: 'document', label: 'Document' },
  { value: 'script', label: 'Script' },
  { value: 'other', label: 'Other' },
];

const ASSET_TYPE_OPTIONS = ASSET_TYPES.filter((t) => t.value !== 'all');

const STATUS_OPTIONS = [
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
];

const TYPE_ICONS = {
  image: '/icons/asset/sprite.svg',
  audio: '/icons/asset/audio.svg',
  video: '/icons/asset/video.svg',
  model: '/icons/asset/model.svg',
  document: '/icons/asset/file.svg',
  script: '/icons/asset/file.svg',
  other: '/icons/asset/file.svg',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ── Asset Form (rendered inside the modal) ─────────────────────────────────────

function AssetForm({ assetToEdit, onSubmit, onCancel, storyData }) {
  const isEdit = assetToEdit !== null;
  const { showToast } = useToast();

  const [name, setName] = useState(isEdit ? assetToEdit.name : '');
  const [description, setDescription] = useState(isEdit ? assetToEdit.description || '' : '');
  const [type, setType] = useState(isEdit ? assetToEdit.type : 'image');
  const [status, setStatus] = useState(isEdit ? assetToEdit.status : 'incomplete');
  const [progress, setProgress] = useState(isEdit ? assetToEdit.progress || 0 : 0);

  // File management
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState(
    isEdit && assetToEdit.files ? [...assetToEdit.files] : []
  );
  const [filesToRemove, setFilesToRemove] = useState([]);
  const fileInputRef = useRef(null);

  // Related items
  const [relatedItems, setRelatedItems] = useState(
    isEdit && assetToEdit.relatedItems ? [...assetToEdit.relatedItems] : []
  );

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const validFiles = [];

    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        showToast(`File "${file.name}" exceeds 50MB limit`, 'error');
        continue;
      }
      if (selectedFiles.some((f) => f.name === file.name && f.size === file.size)) {
        showToast(`File "${file.name}" already added`, 'warning');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
    // Reset input so the same file can be re-added after removal
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (fileId) => {
    setFilesToRemove((prev) => [...prev, fileId]);
    setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const toggleRelatedItem = (id, itemType) => {
    setRelatedItems((prev) => {
      const exists = prev.some((r) => r.id === id && r.type === itemType);
      if (exists) {
        return prev.filter((r) => !(r.id === id && r.type === itemType));
      }
      return [...prev, { id, type: itemType }];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    onSubmit({
      id: isEdit ? assetToEdit.id : generateId(),
      name: trimmedName,
      description: description.trim(),
      type,
      status,
      progress: Number(progress),
      relatedItems,
      existingFiles,
      filesToRemove,
      selectedFiles,
      createdAt: isEdit ? assetToEdit.createdAt : new Date().toISOString(),
    });
  };

  const { characters, locations, items, quests } = storyData;

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit Asset' : 'Add New Asset'}</h3>

      <div className="form-group">
        <label htmlFor="assetName">Asset Name *</label>
        <input
          type="text"
          id="assetName"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter asset name"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="assetDescription">Description</label>
        <textarea
          id="assetDescription"
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add notes or description"
        />
      </div>

      <div className="form-group">
        <label htmlFor="assetType">Type</label>
        <select id="assetType" value={type} onChange={(e) => setType(e.target.value)}>
          {ASSET_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="assetStatus">Status</label>
        <select id="assetStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="assetProgress">Progress ({progress}%)</label>
        <input
          type="range"
          id="assetProgress"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="assetFiles">Upload Files (Multiple)</label>
        <input
          type="file"
          id="assetFiles"
          ref={fileInputRef}
          accept="image/*,audio/*,video/*,.pdf,.txt,.glb,.gltf,.fbx"
          multiple
          onChange={handleFileChange}
        />
        <small className="form-hint">Max file size per file: 50MB. You can select multiple files.</small>

        {selectedFiles.length > 0 && (
          <div className="current-files">
            <strong>Selected files ({selectedFiles.length}):</strong>
            <ul className="file-list">
              {selectedFiles.map((file, idx) => (
                <li key={`new-${idx}`}>
                  <span>
                    {file.name} ({formatFileSize(file.size)})
                  </span>
                  <button
                    type="button"
                    className="btn-remove-file"
                    onClick={() => removeSelectedFile(idx)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {existingFiles.length > 0 && (
          <div className="current-files">
            <strong>Current files ({existingFiles.length}):</strong>
            <ul className="file-list">
              {existingFiles.map((f, idx) => (
                <li key={f.id}>
                  <span>
                    {f.fileName || `File ${idx + 1}`} ({formatFileSize(f.fileSize || 0)})
                  </span>
                  <button
                    type="button"
                    className="btn-remove-file"
                    onClick={() => removeExistingFile(f.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Related items (story elements) */}
      {(characters.length > 0 || locations.length > 0 || items.length > 0 || quests.length > 0) && (
        <div className="form-group">
          <label>Link to Story Elements</label>
          <div className="linked-items-section">
            {characters.length > 0 && (
              <RelatedItemCheckboxes
                label="Characters"
                items={characters}
                itemType="character"
                relatedItems={relatedItems}
                onToggle={toggleRelatedItem}
              />
            )}
            {locations.length > 0 && (
              <RelatedItemCheckboxes
                label="Locations"
                items={locations}
                itemType="location"
                relatedItems={relatedItems}
                onToggle={toggleRelatedItem}
              />
            )}
            {items.length > 0 && (
              <RelatedItemCheckboxes
                label="Items"
                items={items}
                itemType="item"
                relatedItems={relatedItems}
                onToggle={toggleRelatedItem}
              />
            )}
            {quests.length > 0 && (
              <RelatedItemCheckboxes
                label="Quests"
                items={quests}
                itemType="quest"
                relatedItems={relatedItems}
                onToggle={toggleRelatedItem}
              />
            )}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {isEdit ? 'Update' : 'Add'} Asset
        </button>
      </div>
    </form>
  );
}

// ── Related Item Checkboxes ────────────────────────────────────────────────────

function RelatedItemCheckboxes({ label, items, itemType, relatedItems, onToggle }) {
  return (
    <div className="link-section">
      <label>{label}</label>
      <div className="checkbox-group">
        {items.map((item) => {
          const checked = relatedItems.some((r) => r.id === item.id && r.type === itemType);
          return (
            <label key={item.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(item.id, itemType)}
              />
              <span>{item.name || item.title}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── Asset Card ─────────────────────────────────────────────────────────────────

function AssetCard({ asset, onEdit, onDelete }) {
  const fileCount = asset.files ? asset.files.length : asset.hasFile ? 1 : 0;
  const totalSize = asset.files
    ? asset.files.reduce((sum, f) => sum + (f.fileSize || 0), 0)
    : asset.fileSize || 0;

  const thumbnail =
    asset.files && asset.files.length > 0 && asset.files[0].thumbnail
      ? asset.files[0].thumbnail
      : asset.thumbnail;

  return (
    <div className="asset-card">
      {thumbnail ? (
        <div className="asset-thumbnail">
          <img src={thumbnail} alt={asset.name} />
          {fileCount > 1 && <div className="file-count-badge">{fileCount} files</div>}
        </div>
      ) : (
        <div className="asset-icon">
          <img
            src={TYPE_ICONS[asset.type] || TYPE_ICONS.other}
            alt={asset.type}
            width="32"
            height="32"
          />
        </div>
      )}

      <div className="asset-content">
        <div className="asset-title">{asset.name}</div>
        {asset.description && <div className="asset-description">{asset.description}</div>}

        {/* Progress bar */}
        {asset.progress > 0 && (
          <div className="asset-progress">
            <div className="asset-progress-bar">
              <div
                className="asset-progress-fill"
                style={{ width: `${asset.progress}%` }}
              />
            </div>
            <span className="asset-progress-text">{asset.progress}%</span>
          </div>
        )}

        <div className="asset-meta">
          <span className={`asset-badge status-${asset.status}`}>{asset.status}</span>
          <span className="asset-badge asset-type-badge">
            <img
              src={TYPE_ICONS[asset.type] || TYPE_ICONS.other}
              alt=""
              width="12"
              height="12"
            />
            {asset.type}
          </span>
          {totalSize > 0 && (
            <span className="asset-badge">{formatFileSize(totalSize)}</span>
          )}
          {fileCount > 0 && (
            <span className="asset-badge">
              {fileCount} file{fileCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="asset-actions">
        <button className="btn btn-small btn-secondary" onClick={() => onEdit(asset)}>
          Edit
        </button>
        <button className="btn btn-small btn-danger" onClick={() => onDelete(asset.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Main Assets Component ──────────────────────────────────────────────────────

export default function Assets() {
  const { assets, story, addItem, updateItem, deleteItem } = useApp();
  const { openModal, closeModal } = useModal();
  const { showToast, showConfirm } = useToast();

  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const storyData = useMemo(
    () => ({
      characters: story?.characters || [],
      locations: story?.locations || [],
      items: story?.items || [],
      quests: story?.quests || [],
    }),
    [story]
  );

  // ── Filter & search ──────────────────────────────────────────────────────────

  const filteredAssets = useMemo(() => {
    let result = [...assets];

    if (typeFilter !== 'all') {
      result = result.filter((a) => a.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          (a.name && a.name.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q))
      );
    }

    return result;
  }, [assets, typeFilter, searchQuery]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleFormSubmit = useCallback(
    async (formData) => {
      try {
        const { selectedFiles, filesToRemove, existingFiles, ...assetFields } = formData;

        // Delete removed files from IndexedDB
        for (const fileId of filesToRemove) {
          try {
            await deleteFile(fileId);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }

        // Build final files array from remaining existing files
        const files = [...existingFiles];

        // Save new files to IndexedDB
        for (const file of selectedFiles) {
          const fileId = generateId();
          await saveFile(fileId, file);

          const fileRecord = {
            id: fileId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            uploadDate: new Date().toISOString(),
          };

          // Generate thumbnail for the first image
          if (file.type.startsWith('image/') && !files.some((f) => f.thumbnail)) {
            fileRecord.thumbnail = await createThumbnail(file);
          }

          files.push(fileRecord);
        }

        const assetData = {
          ...assetFields,
          files,
          hasFile: files.length > 0,
          fileName: files.length > 0 ? files[0].fileName : '',
        };

        const existing = assets.find((a) => a.id === assetData.id);
        if (existing) {
          const { id, ...updates } = assetData;
          updateItem('assets', id, updates);
          showToast('Asset updated successfully', 'success');
        } else {
          addItem('assets', assetData);
          showToast('Asset added successfully', 'success');
        }
        closeModal();
      } catch (error) {
        console.error('Error saving asset:', error);
        showToast('Error saving asset. Please try again.', 'error');
      }
    },
    [assets, addItem, updateItem, closeModal, showToast]
  );

  const openAssetModal = useCallback(
    (assetToEdit = null) => {
      openModal(
        <AssetForm
          assetToEdit={assetToEdit}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
          storyData={storyData}
        />
      );
    },
    [openModal, closeModal, handleFormSubmit, storyData]
  );

  const handleDelete = useCallback(
    (id) => {
      const asset = assets.find((a) => a.id === id);
      const fileCount = asset && asset.files ? asset.files.length : asset && asset.hasFile ? 1 : 0;
      const msg = `Are you sure you want to delete this asset?${
        fileCount > 0 ? ` This will also delete ${fileCount} file(s).` : ''
      }`;

      showConfirm(msg, async () => {
        try {
          if (asset && asset.files) {
            for (const file of asset.files) {
              await deleteFile(file.id);
            }
          } else if (asset && asset.hasFile) {
            await deleteFile(id);
          }
        } catch (error) {
          console.error('Error deleting files:', error);
        }

        deleteItem('assets', id);
        showToast('Asset deleted', 'success');
      });
    },
    [assets, deleteItem, showConfirm, showToast]
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="assets-section">
      <div className="assets-toolbar">
        <button className="btn btn-primary" onClick={() => openAssetModal()}>
          + Add Asset
        </button>

        <div className="assets-controls">
          <div className="assets-filters">
            {ASSET_TYPES.map((t) => (
              <button
                key={t.value}
                className={`filter-btn${typeFilter === t.value ? ' active' : ''}`}
                onClick={() => setTypeFilter(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="assets-search">
            <input
              type="text"
              placeholder="Search assets…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      <div className="assets-list">
        {filteredAssets.length === 0 ? (
          <div className="assets-empty">
            <p>
              {assets.length === 0
                ? 'No assets yet. Click "Add Asset" to create one!'
                : 'No assets match your filters.'}
            </p>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEdit={openAssetModal}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
