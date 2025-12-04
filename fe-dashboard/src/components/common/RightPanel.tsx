import React, { useState, useEffect } from 'react';
import { Meeting } from '../../types/Meeting.type';
import { meetingsService } from '../../services/meetings.service';
import { toast } from 'sonner';
import { Markdown } from '../../utils/markdownUtils';

interface RightPanelProps {
  meeting: Meeting;
  onUpdate: () => void;
}

type TabType = 'summary' | 'highlights' | 'comments' | 'notes';

interface Highlight {
  transcriptIndex: number;
  text: string;
}

interface Comment {
  transcriptIndex: number;
  comment: string;
  timestamp: Date;
}

export const RightPanel: React.FC<RightPanelProps> = ({ meeting, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [newComment, setNewComment] = useState<{ index: number; text: string } | null>(null);

  useEffect(() => {
    const extra = meeting.extra || {};
    setHighlights((extra.highlights as Highlight[]) || []);
    setComments((extra.comments as Comment[]) || []);
    setNotes((extra.notes as string) || '');
  }, [meeting]);

  const saveExtra = async (updates: Record<string, unknown>) => {
    try {
      const currentExtra = meeting.extra || {};
      await meetingsService.update(meeting.id, {
        extra: {
          ...currentExtra,
          ...updates,
        },
      });
      toast.success('Saved successfully');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to save', {
        description: error?.response?.data?.message || error.message,
      });
    }
  };

  const handleAddHighlight = (index: number, text: string) => {
    const newHighlight: Highlight = { transcriptIndex: index, text };
    const updated = [...highlights, newHighlight];
    setHighlights(updated);
    saveExtra({ highlights: updated });
  };

  const handleAddComment = (index: number) => {
    if (!newComment || newComment.index !== index || !newComment.text.trim()) return;

    const comment: Comment = {
      transcriptIndex: index,
      comment: newComment.text,
      timestamp: new Date(),
    };
    const updated = [...comments, comment];
    setComments(updated);
    saveExtra({ comments: updated });
    setNewComment(null);
  };

  const handleSaveNotes = () => {
    saveExtra({ notes });
  };

  type TranscriptEntry = {
    speaker: string;
    text: string;
    timestamp?: string;
    start?: number;
    end?: number;
  };

  const getCondensedTranscript = (): TranscriptEntry[] => {
    const transcript = (meeting.formattedLines || meeting.rawTranscript || []) as TranscriptEntry[];
    return transcript.slice(0, 10); // Show first 10 entries as condensed view
  };

  const condensedTranscript = getCondensedTranscript();

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === 'summary'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab('highlights')}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === 'highlights'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Highlights
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === 'comments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Comments
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === 'notes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Notes
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'summary' && (
          <div className="space-y-3">
            {meeting.summary ? (
              <Markdown content={meeting.summary} className="text-sm" />
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                No summary available
              </div>
            )}
          </div>
        )}

        {activeTab === 'highlights' && (
          <div className="space-y-3">
            {condensedTranscript.map((entry, index) => {
              const isHighlighted = highlights.some((h) => h.transcriptIndex === index);
              return (
                <div key={index} className="border-b border-gray-100 pb-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{entry.speaker}</span>
                    <span className="text-xs text-gray-500">{entry.timestamp || ''}</span>
                  </div>
                  <div className="text-sm text-gray-900 mb-2 max-h-[200px] overflow-y-auto pr-2">
                    {entry.text}
                  </div>
                  {!isHighlighted && (
                    <button
                      onClick={() => handleAddHighlight(index, entry.text)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      + Add to highlights
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-3">
            {condensedTranscript.map((entry, index) => {
              const entryComments = comments.filter((c) => c.transcriptIndex === index);
              const isAddingComment = newComment?.index === index;

              return (
                <div key={index} className="border-b border-gray-100 pb-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{entry.speaker}</span>
                    <span className="text-xs text-gray-500">{entry.timestamp || ''}</span>
                  </div>
                  <div className="text-sm text-gray-900 mb-2 max-h-[200px] overflow-y-auto pr-2">
                    {entry.text}
                  </div>
                  
                  {entryComments.map((comment, cIndex) => (
                    <div key={cIndex} className="ml-4 mb-2 p-2 bg-gray-50 rounded text-xs">
                      <p className="text-gray-700">{comment.comment}</p>
                      <span className="text-gray-500 text-xs">
                        {new Date(comment.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}

                  {isAddingComment && newComment ? (
                    <div className="ml-4">
                      <textarea
                        value={newComment.text}
                        onChange={(e) => setNewComment({ index, text: e.target.value })}
                        placeholder="Add a comment..."
                        className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                        rows={2}
                      />
                      <div className="flex space-x-2 mt-1">
                        <button
                          onClick={() => handleAddComment(index)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setNewComment(null)}
                          className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewComment({ index, text: '' })}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      + Add comment
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes here..."
              className="w-full p-3 border border-gray-300 rounded text-sm resize-none"
              rows={15}
            />
            <button
              onClick={handleSaveNotes}
              className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save Notes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

