import Link from 'next/link';
import { showcaseExamples } from '@/lib/examples';

const categoryColors = {
  basic: 'bg-blue-600',
  advanced: 'bg-purple-600',
  animation: 'bg-green-600',
  text: 'bg-yellow-600',
  media: 'bg-pink-600',
};

const categoryLabels = {
  basic: 'Basic',
  advanced: 'Advanced',
  animation: 'Animation',
  text: 'Text',
  media: 'Media',
};

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[#2d2d30] border-b border-[#3e3e42] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">ThorVG Playground</h1>
              <p className="text-sm text-gray-400 mt-1">Interactive examples for ThorVG Canvas Kit</p>
            </div>
            <div className="flex gap-4">
              <a
                href="https://github.com/thorvg/thorvg"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#3c3c3c] hover:bg-[#505050] rounded-md text-sm transition-colors"
              >
                GitHub
              </a>
              <a
                href="/docs"
                className="px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] rounded-md text-sm transition-colors"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Showcase Examples</h2>
          <p className="text-gray-400 text-sm">
            Click on any example to view the code and live preview. All examples include full import statements
            so you can copy and use them directly in your projects.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {showcaseExamples.map((example) => (
            <Link
              key={example.id}
              href={`/showcase/${example.id}`}
              className="group block bg-[#252526] border border-[#3e3e42] rounded-lg overflow-hidden hover:border-[#0e639c] transition-all hover:shadow-lg hover:shadow-[#0e639c]/20"
            >
              {/* Thumbnail / Preview */}
              <div className="aspect-video bg-[#2d2d30] flex items-center justify-center border-b border-[#3e3e42] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#3e3e42] to-[#2d2d30] opacity-50" />
                <svg
                  className="w-16 h-16 text-gray-600 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
                  />
                </svg>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white group-hover:text-[#4a9eff] transition-colors">
                    {example.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded ${categoryColors[example.category]} text-white font-medium`}>
                    {categoryLabels[example.category]}
                  </span>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">{example.description}</p>
              </div>

              {/* Footer */}
              <div className="px-4 pb-4">
                <div className="flex items-center text-xs text-gray-500">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                  View Code & Preview
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-[#252526] border border-[#3e3e42] rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
          <p className="text-sm text-gray-400 mb-4">
            To use ThorVG Canvas Kit in your project, install it via npm or yarn:
          </p>
          <pre className="bg-[#1e1e1e] p-4 rounded-md text-sm overflow-x-auto">
            <code className="text-green-400">npm install @thorvg/canvas-kit</code>
            <br />
            <code className="text-blue-400"># or</code>
            <br />
            <code className="text-green-400">yarn add @thorvg/canvas-kit</code>
          </pre>
        </div>
      </main>
    </div>
  );
}
