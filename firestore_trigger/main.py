import json
import nagisa
from google.cloud import firestore


# open corpus for sentiment analysis
with open('pn.json', 'r') as f:
    pn_dict = json.load(f)

client = firestore.Client()


def calc_sentiment(data, context):
    """Cloud function trigger for firestore

    Args:
        data: A dictionary containing the data for the event.
        Its format depends on the event.
        context (Context): The context object for the event.
    """

    # get speech-to-text confidence
    confidence = data['value']['fields']['confidence']['doubleValue']

    if confidence > 0.8:
        # get current score
        room_id = data['value']['fields']['room_id']['stringValue']
        member_id = data['value']['fields']['member_id']['stringValue']

        doc_ref = client.collection('rooms').document(
            room_id).collection('members').document(member_id)
        doc = doc_ref.get()
        current_score = doc.to_dict()['score']

        # analyze message sentiment
        message = data['value']['fields']['body']['stringValue']
        words = nagisa.filter(message, filter_postags=[
            '助詞', '助動詞', '補助記号', '記号', '空白'])

        sentiment = 0
        for token in words.words:
            word = token.lower()
            if pn_dict.get(word) is None:
                print('{}: None'.format(word))
                pass
            else:
                score = int(pn_dict.get(word))
                print('{}: {}'.format(word, score))
                sentiment += score
        print('Total sentiment: {}'.format(sentiment))

        if sentiment == 0:
            print('Sentiment is 0. Score has not been updated.')
        else:
            # update score
            new_score = current_score + sentiment
            print('Score updated from {} to {}!'.format(
                current_score, new_score))

            # update firestore members document
            doc_ref.update({
                'score': new_score
            })

        # check if message contains a word of destruction
        if 'バルス' in words.words:
            docs = client.collection('rooms').document(
                room_id).collection('members').where('state', '==', 'connected').stream()
            for doc in docs:
                doc_ref = client.collection('rooms').document(
                    room_id).collection('members').document(doc.id)
                doc_ref.update({
                    'long_score': 100
                })
                print('Long score updated for {}'.format(doc.id))
        else:
            pass

    else:
        print('Confidence is low. Score has not been updated.')
