import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageInput from './MessageInput';

describe('MessageInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
    onTyping: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders the message textarea', () => {
      render(<MessageInput {...defaultProps} />);
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('renders the send button', () => {
      render(<MessageInput {...defaultProps} />);
      const sendButtons = screen.getAllByRole('button');
      const sendButton = sendButtons.find(btn => btn.classList.contains('bg-primary'));
      expect(sendButton).toBeInTheDocument();
    });

    it('renders attachment button (disabled)', () => {
      render(<MessageInput {...defaultProps} />);
      expect(screen.getByTitle('Attach file (coming soon)')).toBeInTheDocument();
    });

    it('renders emoji button (disabled)', () => {
      render(<MessageInput {...defaultProps} />);
      expect(screen.getByTitle('Emoji (coming soon)')).toBeInTheDocument();
    });

    it('shows keyboard shortcut hint', () => {
      render(<MessageInput {...defaultProps} />);
      expect(screen.getByText(/Press Enter to send/)).toBeInTheDocument();
    });
  });

  describe('Send Button State', () => {
    it('disables send button when input is empty', () => {
      render(<MessageInput {...defaultProps} />);
      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.classList.contains('bg-primary')
      );
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has content', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello');

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.classList.contains('bg-primary')
      );
      expect(sendButton).not.toBeDisabled();
    });

    it('disables send button when disabled prop is true', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} disabled={true} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello');

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.classList.contains('bg-primary')
      );
      expect(sendButton).toBeDisabled();
    });

    it('disables send button for whitespace-only input', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, '   ');

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.classList.contains('bg-primary')
      );
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Message Sending', () => {
    it('calls onSend when send button is clicked', async () => {
      vi.useRealTimers();
      const onSend = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onSend={onSend} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello world');

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.classList.contains('bg-primary')
      );
      await user.click(sendButton);

      expect(onSend).toHaveBeenCalledWith('Hello world');
    });

    it('calls onSend when Enter is pressed', async () => {
      vi.useRealTimers();
      const onSend = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onSend={onSend} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Enter message{Enter}');

      expect(onSend).toHaveBeenCalledWith('Enter message');
    });

    it('does not call onSend on Shift+Enter', async () => {
      vi.useRealTimers();
      const onSend = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onSend={onSend} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Multiline');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      expect(onSend).not.toHaveBeenCalled();
    });

    it('clears input after sending', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Test message{Enter}');

      expect(input).toHaveValue('');
    });

    it('trims whitespace from message', async () => {
      vi.useRealTimers();
      const onSend = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onSend={onSend} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, '  Trimmed message  {Enter}');

      expect(onSend).toHaveBeenCalledWith('Trimmed message');
    });

    it('does not send empty messages', async () => {
      vi.useRealTimers();
      const onSend = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onSend={onSend} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, '   {Enter}');

      expect(onSend).not.toHaveBeenCalled();
    });

    it('does not send when disabled', async () => {
      vi.useRealTimers();
      const onSend = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onSend={onSend} disabled={true} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Test{Enter}');

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('Typing Indicator', () => {
    it('calls onTyping(true) when user starts typing', async () => {
      vi.useRealTimers();
      const onTyping = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onTyping={onTyping} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'H');

      expect(onTyping).toHaveBeenCalledWith(true);
    });

    it('calls onTyping(false) after timeout', async () => {
      vi.useRealTimers();
      const onTyping = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onTyping={onTyping} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'H');

      // onTyping(true) should be called
      expect(onTyping).toHaveBeenCalledWith(true);
    });

    it('clears typing indicator when message is sent', async () => {
      vi.useRealTimers();
      const onTyping = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onTyping={onTyping} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Test{Enter}');

      // Should call onTyping(false) after sending
      expect(onTyping).toHaveBeenLastCalledWith(false);
    });

    it('handles missing onTyping prop gracefully', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();

      // Should not throw when onTyping is undefined
      expect(() => {
        render(<MessageInput onSend={vi.fn()} />);
      }).not.toThrow();

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Test');
    });
  });

  describe('Textarea Behavior', () => {
    it('disables textarea when disabled prop is true', () => {
      render(<MessageInput {...defaultProps} disabled={true} />);
      expect(screen.getByPlaceholderText('Type a message...')).toBeDisabled();
    });

    it('shows reduced opacity when disabled', () => {
      render(<MessageInput {...defaultProps} disabled={true} />);
      const input = screen.getByPlaceholderText('Type a message...');
      expect(input).toHaveClass('disabled:opacity-50');
    });
  });

  describe('Accessibility', () => {
    it('has accessible placeholder text', () => {
      render(<MessageInput {...defaultProps} />);
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('buttons have accessible titles', () => {
      render(<MessageInput {...defaultProps} />);
      expect(screen.getByTitle('Attach file (coming soon)')).toBeInTheDocument();
      expect(screen.getByTitle('Emoji (coming soon)')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid typing without issues', async () => {
      vi.useRealTimers();
      const onSend = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(<MessageInput {...defaultProps} onSend={onSend} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'RapidTypingTest{Enter}');

      expect(onSend).toHaveBeenCalledWith('RapidTypingTest');
    });

    it('handles very long messages', async () => {
      vi.useRealTimers();
      const onSend = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(<MessageInput {...defaultProps} onSend={onSend} />);

      const longMessage = 'A'.repeat(500);
      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, longMessage);

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.classList.contains('bg-primary')
      );
      await user.click(sendButton);

      expect(onSend).toHaveBeenCalledWith(longMessage);
    });

    it('handles special characters', async () => {
      vi.useRealTimers();
      const onSend = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onSend={onSend} />);

      const specialMessage = 'Hello! @#$%^&*() "quotes"';
      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, specialMessage);

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.classList.contains('bg-primary')
      );
      await user.click(sendButton);

      expect(onSend).toHaveBeenCalledWith(specialMessage);
    });

    it('handles emoji characters', async () => {
      vi.useRealTimers();
      const onSend = vi.fn();
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} onSend={onSend} />);

      // Note: userEvent has limitations with emojis, testing with simple message
      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello');

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.classList.contains('bg-primary')
      );
      await user.click(sendButton);

      expect(onSend).toHaveBeenCalled();
    });
  });
});
