interface Props { questions: string[]; }

export function DiscussionQuestions({ questions }: Props) {
    if (questions.length === 0) return null;
    return (
        <section className="discussion" aria-labelledby="discussion-heading">
            <h2 id="discussion-heading" className="section-heading">Discussion Questions</h2>
            <ol className="discussion-list">
                {questions.map((q, i) => <li key={i} className="discussion-item">{q}</li>)}
            </ol>
        </section>
    );
}
