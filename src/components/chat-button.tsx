'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

export function ChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const chatIframeRef = useRef<HTMLIFrameElement>(null)

  // Set isClient to true on mount to track if we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen)
  }

  // Cleanup function to handle iframe removal properly - only on client side
  useEffect(() => {
    // Only set up cleanup if we're on the client side
    if (!isClient) {
      return;
    }

    return () => {
      // Clear iframe content and references when component unmounts
      if (chatIframeRef.current) {
        try {
          // Set src to empty to stop any active connections
          chatIframeRef.current.src = 'about:blank';

          // Clear any content
          if (chatIframeRef.current.contentDocument) {
            try {
              chatIframeRef.current.contentDocument.documentElement.innerHTML = '';
            } catch (e) {
              // Ignore errors accessing contentDocument due to cross-origin restrictions
            }
          }
        } catch (e) {
          // Ignore any errors that might occur during cleanup
        }
      }
    };
  }, [isClient]);

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center z-40 hover:shadow-xl transition-shadow"
      >
        <Image
          src="/images/chatbot.png"
          alt="Chat Agent"
          width={60}
          height={60}
          className="rounded-full"
        />
      </button>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-white rounded-lg shadow-xl z-40 flex flex-col overflow-hidden">
          <div className="bg-flyadeal-purple p-3 text-white flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/images/chatbot.png"
                alt="Chat Agent"
                width={30}
                height={30}
                className="rounded-full mr-2"
              />
              <span>flyadeal Copilot</span>
            </div>
            <button onClick={toggleChat} className="text-white hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="h-full">
              {isClient ? (
                <iframe 
                  ref={chatIframeRef}
                  src="https://copilotstudio.microsoft.com/environments/Default-6b8805cf-83d0-4342-bd38-fb3b3df952be/bots/cr6d3_agent_bMRR9X/webchat?__version__=2" 
                  frameBorder="0" 
                  className="w-full h-full"
                ></iframe>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Loading chat interface...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
