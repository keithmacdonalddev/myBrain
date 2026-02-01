/**
 * Feedback feature exports
 *
 * Usage example:
 * const [feedbackOpen, setFeedbackOpen] = useState(false);
 * <FeedbackWidget onOpenFeedback={() => setFeedbackOpen(true)} />
 * <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
 *
 * Hook example:
 * const { captureMetadata } = useMetadataCapture();
 * const metadata = captureMetadata();
 */

export { default as FeedbackWidget } from './components/FeedbackWidget';
export { default as FeedbackModal } from './components/FeedbackModal';
export { useMetadataCapture } from './hooks/useMetadataCapture';
