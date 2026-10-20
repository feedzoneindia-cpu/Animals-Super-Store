import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FAQ_DATA } from '../../constants/faqData.js';
import useSEO from '../../hooks/useSEO.js';
import { faqSchema } from '../../utils/seoSchema.js';

export default function FAQ() {
  useSEO({
    title: 'Frequently Asked Questions',
    description:
      'Find answers to common questions about Animals feeds, pet supplies, order delivery, live Animals listings, and account management.',
    jsonLd: faqSchema(FAQ_DATA),
  });

  const [openIndex, setOpenIndex] = useState({});

  const toggleQuestion = (categoryIdx, questionIdx) => {
    const key = `${categoryIdx}-${questionIdx}`;
    setOpenIndex((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="bg-white py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            Help & Answers
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
            Everything you need to know about our feeds, pet supplies, ordering, and Animals care policies.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {FAQ_DATA.map((cat, catIdx) => (
            <div key={cat.category} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                {cat.category}
              </h2>
              <div className="mt-4 divide-y divide-gray-100">
                {cat.questions.map((item, qIdx) => {
                  const key = `${catIdx}-${qIdx}`;
                  const isOpen = Boolean(openIndex[key]);

                  return (
                    <div key={item.q} className="py-4">
                      <button
                        type="button"
                        onClick={() => toggleQuestion(catIdx, qIdx)}
                        className="flex w-full items-center justify-between text-left text-sm font-semibold text-gray-900 transition-colors hover:text-brand-700"
                        aria-expanded={isOpen}
                      >
                        <span className="pr-4">{item.q}</span>
                        <span className="shrink-0 text-brand-700 text-lg">
                          {isOpen ? '−' : '+'}
                        </span>
                      </button>
                      {isOpen && (
                        <p className="mt-3 text-sm leading-6 text-gray-600">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions banner */}
        <div className="mt-12 rounded-2xl bg-brand-50 p-8 text-center sm:p-10">
          <h2 className="text-xl font-bold text-brand-900">Still have a question?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-brand-800">
            Cannot find the answer you are looking for? Our friendly team is ready to assist you.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/contact"
              className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 shadow-sm"
            >
              Contact Us
            </Link>
            <Link
              to="/location"
              className="rounded-lg border border-brand-300 bg-white px-5 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
            >
              Visit Store
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
