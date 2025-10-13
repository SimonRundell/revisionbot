<?php

include 'setup.php';

    $prompt = "I am a T-Level / BTec student who is answering this question --->";
    $prompt .= $receivedData['question'] . "--->";
    $prompt .= "This is the markscheme I am to be assessed against --->";
    $prompt .= $receivedData['markscheme'] . "--->";
    $prompt .= "This is my answer --->";
    $prompt .= $receivedData['useranswer'] . "--->";
    $prompt .= "Please give me detailed feedback in HTML in this exact format--->";
    $prompt .= "<h4>The Question</h4><p>{Output the question}</p>";
    // $prompt .= "<h4>The Markscheme</h4><p>{Output what the markscheme says}</p>";
    $prompt .= "<h4>Your Reponse</h4><p>{What I responded with}</p>";
    $prompt .= "<h4>AI Feedback</h4><p>{Assessment of how well I have met each point on the mark scheme and noting any areas for improvement based on both the markscheme and your own knowledge on the subject}</p>";
    $prompt .= "<h4>Model Example</h4><p>{A model example to demonstrate how it can be done properly}</p>";

    log_info("API Request: " . $prompt);

  // Gemini API Data from config
    $apiKey = $config['geminiApiKey'];
    $url = $config['geminiApiUrl'];

    $data = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $prompt]
                ]
            ]
        ]
    ];


    // Use file_get_contents instead of cURL since cURL is not available
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($data)
        ]
    ]);
    
    $response = file_get_contents($url . '?key=' . $apiKey, false, $context);
    
    if ($response === false) {
        echo json_encode(["error" => "Failed to make API request"]);
    } else {
        // Log the response for debugging
        file_put_contents('response_log.txt', $response);

        // Parse the response and check for elements
        $responseData = json_decode($response, true);
        if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
            $content = $responseData['candidates'][0]['content']['parts'][0]['text'];
            log_info("API Response: " . $content);
            send_response($content, 200);
        } else {
            // Log the full response for debugging
            log_info("Unexpected API Response: " . $response);
            send_response("Unexpected response format: ". $response, 500);
        }
    }

?>