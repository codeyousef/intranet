'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

export function ChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen)
    if (!isChatOpen) {
      setSelectedCategory(null) // Reset selected category when opening chat
    }
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center z-40 hover:shadow-xl transition-shadow"
      >
        <Image
          src="/images/agent.jpg"
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
              {selectedCategory === 'hr-policy' ? (
                <button 
                  onClick={() => setSelectedCategory(null)} 
                  className="text-white hover:text-gray-200 flex items-center mr-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  <span>Back</span>
                </button>
              ) : (
                <>
                  <Image
                    src="/images/agent.jpg"
                    alt="Chat Agent"
                    width={30}
                    height={30}
                    className="rounded-full mr-2"
                  />
                  <span>Chat Assistant</span>
                </>
              )}
            </div>
            <button onClick={toggleChat} className="text-white hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedCategory === 'hr-policy' ? (
              <div className="h-full">
                <iframe 
                  src="https://copilotstudio.microsoft.com/environments/Default-6b8805cf-83d0-4342-bd38-fb3b3df952be/bots/cr6d3_agent_bMRR9X/webchat?__version__=2" 
                  frameBorder="0" 
                  className="w-full h-full"
                ></iframe>
              </div>
            ) : (
              <div className="p-4">
                {/* Chat message with agent image */}
                <div className="flex items-start mb-4">
                  <Image
                    src="/images/agent.jpg"
                    alt="Chat Agent"
                    width={40}
                    height={40}
                    className="rounded-full mr-3"
                  />
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[85%]">
                    <p className="text-gray-800">
                      Hi! I'm your virtual chatbot assistant, please select one of the below areas that you need help with:
                    </p>
                  </div>
                </div>

                {/* Help category buttons */}
                <div className="flex flex-row space-x-2 mt-4 justify-center">
                  <button 
                    onClick={() => setSelectedCategory('hr-policy')}
                    className="bg-flyadeal-purple text-white py-2 px-3 rounded-lg hover:bg-flyadeal-purple/90 transition-colors w-24 text-sm"
                  >
                    HR Policy
                  </button>
                  <button 
                    onClick={() => setSelectedCategory('it-policy')}
                    className="bg-flyadeal-purple text-white py-2 px-3 rounded-lg hover:bg-flyadeal-purple/90 transition-colors w-24 text-sm"
                  >
                    IT Policy
                  </button>
                  <button 
                    onClick={() => setSelectedCategory('it-helpdesk')}
                    className="bg-flyadeal-purple text-white py-2 px-3 rounded-lg hover:bg-flyadeal-purple/90 transition-colors w-24 text-sm"
                  >
                    IT Helpdesk
                  </button>
                </div>
              </div>
            )}
          </div>
          {selectedCategory !== 'hr-policy' && (
            <div className="border-t p-3">
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full p-2 border rounded-lg"
                disabled
              />
            </div>
          )}
        </div>
      )}
    </>
  )
}
