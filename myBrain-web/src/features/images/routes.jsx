import { Routes, Route } from 'react-router-dom';
import { Image as ImageIcon, Plus } from 'lucide-react';
import { useImages } from './hooks/useImages';
import ImageUpload from './components/ImageUpload';
import ImageGallery from './components/ImageGallery';
import MobilePageHeader from '../../components/layout/MobilePageHeader';

function ImagesLibraryPage() {
  const { data, isLoading, refetch } = useImages({ folder: 'library' });
  const images = data?.images || [];

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Mobile Header */}
      <MobilePageHeader title="Images" icon={ImageIcon} />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Header */}
          <div className="hidden sm:flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-text">Image Library</h1>
              <p className="text-sm text-muted">
                {images.length} {images.length === 1 ? 'image' : 'images'}
              </p>
            </div>
          </div>

          {/* Mobile subtitle */}
          <p className="sm:hidden text-sm text-muted mb-4">
            {images.length} {images.length === 1 ? 'image' : 'images'}
          </p>

          {/* Upload Section */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-text mb-3">Upload Image</h2>
            <div className="max-w-md">
              <ImageUpload onUploadComplete={refetch} />
            </div>
          </div>

          {/* Gallery Section */}
          <div>
            <h2 className="text-lg font-medium text-text mb-3">Your Images</h2>
            <ImageGallery images={images} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ImagesRoutes() {
  return (
    <Routes>
      <Route index element={<ImagesLibraryPage />} />
    </Routes>
  );
}

export default ImagesRoutes;
